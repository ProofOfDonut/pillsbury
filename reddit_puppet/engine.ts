import {exec} from 'child_process';
import {join} from 'path';
import puppeteer from 'puppeteer';
import {Browser, ElementHandle, Page} from 'puppeteer';
import {
  ensure, ensureEqual, ensurePropString, ensureSafeInteger, ensureString,
} from '../common/ensure';
import {GlazeDbClient} from '../glaze_db';

// This may not be needed. At one point we had trouble signing in and it was
// thought multiple attempts might help, but since then I think those problems
// have been resolved.
const SIGN_IN_ATTEMPTS = 2;
// This URL is requested for both the new Reddit design and the old design.
const BEARER_INTERCEPT_URL =
    `https://s.reddit.com/api/v1/sendbird/unread_message_count`;

const TMP_DIR = new Promise(
    (resolve: (dir: string) => void,
     reject: (err: Error) => void) => {
  exec(
      'mktemp -d /tmp/pb-rs-XXXXXXXX',
      {'encoding': 'utf8'},
      (err: Error, dir: string) => {
    if (err) {
      reject(err);
      return;
    }
    resolve(dir.trim());
  });
});

export async function createRedditPuppetEngine(
    username: string,
    password: string,
    glazeDb: GlazeDbClient):
    Promise<RedditPuppetEngine> {
  return new RedditPuppetEngine(username, password, glazeDb);
}

export class RedditPuppetEngine {
  private hubUsername: string;
  private hubPassword: string;
  private glazeDb: GlazeDbClient;
  private browsers: Browser[] = [];

  constructor(
      username: string,
      password: string,
      glazeDb: GlazeDbClient) {
    this.hubUsername = username;
    this.hubPassword = password;
    this.glazeDb = glazeDb;
  }

  // Problems have occurred where Reddit Puppet ended up with an old
  // authentication token which worked for accessing a subreddit but didn't
  // work for sending donuts. This seemed possibly related to being logged in
  // during preferences changes (changing Reddit redesign preference). When
  // these problems were observed, a single browser instance was being created
  // at instantiation time and shared for all method calls after that. Creating
  // a new browser for each task, as we're doing now, may alleviate the problem
  // because cookies are cleared for each new browser created. This may also
  // save on some overhead, since when the browser isn't needed it can be
  // closed.
  private async createBrowser(): Promise<Browser> {
    const browser = await puppeteer.launch({
      'args': ['--no-sandbox'],
      'defaultViewport': {
        // Reddit becomes 1 column, losing the column with community points, at
        // around 960 pixels.
        'width': 1000,
        'height': 800,
      },
    });
    this.browsers.push(browser);
    return browser;
  }

  async close(browser: Browser) {
    for (let i = 0; i < this.browsers.length; i++) {
      if (this.browsers[i] == browser) {
        this.browsers.splice(i, 1);
        break;
      }
    }
    await browser.close();
  }

  async closeAll() {
    const browsers = this.browsers;
    this.browsers = [];
    await Promise.all(browsers.map(u => u.close()));
  }

  // It should be safe to expose `getRedditHubBearerToken` as an endpoint but to
  // be a little more on the safe side let's just expose an endpoint which
  // updates it in the database.
  async updateRedditHubBearerToken() {
    const token = await this.withPage(
        (page: Page) => this.getRedditHubBearerToken(page));
    await this.glazeDb.setRedditHubBearerToken(token);
  }

  private getRedditHubBearerToken(page: Page): Promise<string> {
    return new Promise<string>(
        async (resolve: (token: string) => void,
               reject: (err: Error) => void) => {
      try {
        let resolved = false;
        let tm: NodeJS.Timeout|null;
        await page.setRequestInterception(true);
        page.on('request', request => {
          try {
            if (request.method().toUpperCase() == 'GET'
                && request.url() == BEARER_INTERCEPT_URL) {
              const auth = ensurePropString(request.headers(), 'authorization');
              const groups = /^bearer ([\w\-\.]+)$/i.exec(auth);
              ensure(groups, `Unrecognized authorization header "${auth}".`);
              resolved = true;
              if (tm) {
                clearTimeout(tm);
              }
              resolve(groups[1]);
            }
          } catch (err) {
            reject(err);
          }
          request.continue();
        });
        await this.signInIfNecessary(page);
        tm = setTimeout(() => {
          if (!resolved) {
            reject(new Error('Timed out waiting for bearer intercept URL.'));
          }
        }, 60000);
      } catch (err) {
        reject(err);
      }
    });
  }

  async sendDonuts(recipient: string, amount: number) {
    // Reddit usernames can currently be 3 to 20 characters long. We'll allow 1
    // to 30 characters in case this changes.
    ensure(
        /^[\w\-]{1,30}$/.test(recipient),
        `Invalid recipient "${recipient}".`);
    ensureSafeInteger(amount);

    await this.withPage(async (page: Page) => {
      await this.goToEthTraderLoggedIn(page);
      await this.sendDonutsInner(page, recipient, amount);
    });
  }

  private async goToEthTraderLoggedIn(page: Page) {
    await this.signInIfNecessary(page);
    if (page.url() != 'https://new.reddit.com/r/ethtrader') {
      await Promise.all([
        page.goto('https://new.reddit.com/r/ethtrader'),
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
      ]);
    }
    ensureEqual(page.url(), 'https://new.reddit.com/r/ethtrader');
    return page;
  }

  private async signInIfNecessary(page: Page) {
    for (let i = 0; i < SIGN_IN_ATTEMPTS - 1; i++) {
      try {
        await this.signInIfNecessaryInner(page);
      } catch (err) {
        continue;
      }
      return;
    }
    // One last try that's not caught, propogating the exception if it fails.
    await this.signInIfNecessaryInner(page);
  }

  private async signInIfNecessaryInner(page: Page) {
    await Promise.all([
      page.goto(
          'https://old.reddit.com/login?dest=https%3A%2F%2Fnew.reddit.com%2Fr%2Fethtrader'),
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);
    if (page.url() != 'https://new.reddit.com/r/ethtrader'
        // Some accounts have observed with a restriction preventing it from
        // loading the Reddit redesign, in which case they are redirected to
        // www.reddit.com.
        && page.url() != 'https://www.reddit.com/r/ethtrader'
        && page.url() != 'https://www.reddit.com/r/ethtrader/') {
      await this.signIn(page);
    }
  }

  private async signIn(page: Page) {
    ensure(
        /^https\:\/\/old\.reddit\.com\/login/.test(page.url()),
        `Incorrect page url "${page.url()}"`);
    let userNameInput: ElementHandle|null = null;
    let passwordInput: ElementHandle|null = null;
    let button: ElementHandle|null = null;
    try {
      ([userNameInput, passwordInput, button] =  await Promise.all([
        this.getUsernameInput(page),
        this.getPasswordInput(page),
        this.getSignInButton(page),
      ]));
    } catch (err) {
      // We may already be signed in. Sometimes it takes time to redirect.
      if (page.url() == 'https://new.reddit.com/r/ethtrader') {
        return;
      } else {
        try {
          await page.waitForNavigation({ waitUntil: 'networkidle0' });
          return;
        } catch (unused_err) {}
      }
      throw err;
    }
    await ensure(userNameInput).type(this.hubUsername);
    await ensure(passwordInput).type(this.hubPassword);
    await page.screenshot({'path': join(await TMP_DIR, 'ss00.png')});
    await Promise.all([
      ensure(button).click(),
      page.waitForNavigation({'waitUntil': 'networkidle0'}),
    ]);
  }

  private async getUsernameInput(page: Page): Promise<ElementHandle> {
    return page.$('form[id="login-form"] input[name="user"]');
  }

  private async getPasswordInput(page: Page): Promise<ElementHandle> {
    return page.$('form[id="login-form"] input[name="passwd"]');
  }

  private async getSignInButton(page: Page): Promise<ElementHandle> {
    return page.$('form[id="login-form"] button[type="submit"]');
  }

  private async sendDonutsInner(page: Page, recipient: string, amount: number) {
    await this.closeInitialDialog(page);
    const openFormButton = await this.getSendDonutButton(page);
    await openFormButton.click();
    await this.waitForDonutForm(page);
    const [amountInput, recipientInput] = await Promise.all([
      this.getAmountInput(page),
      this.getRecipientInput(page),
    ]);
    await amountInput.type(String(amount));
    await recipientInput.type(recipient);
    const sendButton =
        await page.waitForXPath(
            '//div[@role="dialog"]//button[text() = "send" and not(@disabled)]');
    await sendButton.click();
    await this.waitForDialogClosed(page);
  }

  private async closeInitialDialog(page: Page) {
    const els = await page.$x('//div[@role="dialog"]//button[text() = "done"]');
    if (els.length > 0) {
      await els[0].click();
    }
    await this.waitForDialogClosed(page);
  }

  private async waitForDialogClosed(page: Page) {
    // A hack to get TypeScript to ignore the use of `document` below.
    const document: any = null;
    await page.waitFor(
        () => !document.evaluate(
            '//div[@role="dialog"]',
            document.documentElement)
          .iterateNext());
  }

  private async getAmountInput(page: Page): Promise<ElementHandle> {
    const els = await page.$x('//div[@role="dialog"]//input');
    ensureEqual(els.length, 2);
    return els[0];
  }

  private async getRecipientInput(page: Page): Promise<ElementHandle> {
    const els = await page.$x('//div[@role="dialog"]//input');
    ensureEqual(els.length, 2);
    return els[1];
  }

  private async getSendDonutButton(page: Page): Promise<ElementHandle> {
    return page.waitForXPath('//button[text() = "send"]');
  }

  private async waitForDonutForm(page: Page) {
    await page.waitForXPath('//div[@role="dialog"]');
  }

  private async sleep(interval: number) {
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  private async withPage<T>(callback: (page: Page) => Promise<T>) {
    const browser = await this.createBrowser();
    const page = await browser.newPage();
    try {
      // Note: `await` is needed below! It is not redundant! Without it the
      // `try`/`catch` will be ignored.
      return await callback(page);
    } catch (err) {
      const ssPath = join(await TMP_DIR, 'ss_on_error.png');
      await page.screenshot({'path': ssPath});
      console.log(`Saved screenshot to ${ssPath} for URL ${page.url()}`);
      throw err;
    } finally {
      await page.close();
      await this.close(browser);
    }
  }
}
