import {ensure} from '../../common/ensure';
import {readFile} from '../../common/io/files/read';
import {
  getTokenWithPassword,
} from './authentication';
import {Message} from './message';
import {
  getMessages as _getMessages,
  markMessagesRead as _markMessagesRead,
  sendMessage as _sendMessage,
} from './messages';
import {
  transferDonuts as _transferDonuts,
} from './wallets';

export class RedditClient {
  private loadToken: () => Promise<string>|null = null;
  private tokenPromise: Promise<string>|null = null;

  // We delay loading a token until necessary. This helps with development since
  // we don't require an internet connection if the Reddit API isn't going to be
  // used.
  private get token(): Promise<string> {
    if (this.tokenPromise) {
      return this.tokenPromise;
    }
    let tokenResolve: (token: Promise<string>) => void;
    this.tokenPromise = new Promise((r: (token: Promise<string>) => void) => {
      tokenResolve = r;
    });
    tokenResolve((async (): Promise<string> => {
      const loadToken = ensure(this.loadToken);
      this.loadToken = null;
      const token = await loadToken.call(this);
      return token;
    })());
    return this.tokenPromise;
  }

  constructor(
      configFileOrUsername: string,
      password: string = '',
      id: string = '',
      secret: string = '') {
    if (password) {
      this.loadToken = (): Promise<string> =>
          getTokenWithPassword(
              configFileOrUsername, password, id, secret);
    } else {
      this.loadToken = (): Promise<string> =>
          this.getToken(configFileOrUsername);
    }
  }

  private async getToken(configFile: string): Promise<string> {
    const config = JSON.parse(<string> await readFile(configFile, 'utf8'));
    return getTokenWithPassword(
        config['username'],
        config['password'],
        config['id'],
        config['secret']);
  }

  async getMessages(sinceMessage: string): Promise<Array<Message>> {
    return _getMessages(await this.token, sinceMessage);
  }

  async markMessagesRead(ids: string[]): Promise<void> {
    return _markMessagesRead(
        await this.token,
        ids);
  }

  async sendMessage(
      to: string,
      subject: string,
      body: string):
      Promise<void> {
    return _sendMessage(
        await this.token,
        to,
        subject,
        body);
  }

  async transferDonuts(to: string, amount: number): Promise<string> {
    return _transferDonuts(await this.token, to, amount);
  }
}
