import {exec} from 'child_process';
import {join} from 'path';
import * as puppeteer from 'puppeteer';
import {Browser, ElementHandle, Page} from 'puppeteer';
import {
  ensure, ensureEqual, ensurePropString, ensureSafeInteger, ensureString,
} from '../common/ensure';
import {GlazeDbClient} from '../glaze_db';

// This may not be needed. At one point we had trouble signing in and it was
// thought multiple attempts might help, but since then I think those problems
// have been resolved.
const SIGN_IN_ATTEMPTS = 2;
const SUBREDDIT_ID = 't5_37jgj';
const BEARER_INTERCEPT_URL =
    `https://meta-api.reddit.com/ratings/${SUBREDDIT_ID}/points-weekly`;

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
  const browser = await puppeteer.launch({
    'args': ['--no-sandbox'],
    'defaultViewport': {
      // Reddit becomes 1 column, losing the column with community points, at
      // around 960 pixels.
      'width': 1000,
      'height': 800,
    },
  });
  return new RedditPuppetEngine(browser, username, password, glazeDb);
}

export class RedditPuppetEngine {
  private browser: Browser;
  private hubUsername: string;
  private hubPassword: string;
  private glazeDb: GlazeDbClient;

  constructor(
      browser: Browser,
      username: string,
      password: string,
      glazeDb: GlazeDbClient) {
    this.browser = browser;
    this.hubUsername = username;
    this.hubPassword = password;
    this.glazeDb = glazeDb;
  }

  async close() {
    await this.browser.close();
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
        await this.goToEthTraderLoggedIn(page);
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
    for (let i = 0; i < SIGN_IN_ATTEMPTS - 1; i++) {
      try {
        await this.goToEthTraderLoggedInInner(page);
      } catch (err) {
        continue;
      }
      return;
    }
    // One last try that's not caught, propogating the exception if it fails.
    await this.goToEthTraderLoggedInInner(page);
  }

  private async goToEthTraderLoggedInInner(page: Page) {
    await Promise.all([
      page.goto(
          'https://old.reddit.com/login?dest=https%3A%2F%2Fnew.reddit.com%2Fr%2Fethtrader'),
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);
    if (page.url() != 'https://new.reddit.com/r/ethtrader') {
      await this.signIn(page);
    }
    ensureEqual(page.url(), 'https://new.reddit.com/r/ethtrader');
    return page;
  }

  private async signIn(page: Page) {
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
    const page = await this.browser.newPage();
    try {
      // Note: `await` is needed below! It is not redundant! Without it the
      // `try`/`catch` will be ignored.
      return await callback(page);
    } catch (err) {
      const ssPath = join(await TMP_DIR, 'ss_on_error.png');
      await page.screenshot({'path': ssPath});
      console.log(`Saved screenshot to ${ssPath}`);
      throw err;
    } finally {
      await page.close();
    }
  }
}
