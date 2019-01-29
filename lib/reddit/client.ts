import {ensure, ensurePropString} from '../../common/ensure';
import {readFile} from '../../common/io/files/read';
import {
  TokenInfo, getTokenWithPassword, getTokenWithRefreshToken,
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

type Config = {
  username: string;
  password: string;
  clientId: string;
  secret: string;
};

export async function createRedditClientFromConfigFile(
    configFile: string):
    Promise<RedditClient> {
  const config = JSON.parse(<string> await readFile(configFile, 'utf8'));
  return new RedditClient(
      ensurePropString(config, 'username'),
      ensurePropString(config, 'password'),
      ensurePropString(config, 'id'),
      ensurePropString(config, 'secret'));
}

export class RedditClient {
  private tokenInfo: TokenInfo|null = null;
  private config: Config;

  constructor(
      username: string,
      password: string,
      clientId: string,
      secret: string) {
    this.config = {username, password, clientId, secret};
  }

  private async getToken(): Promise<string> {
    if (!this.tokenInfo) {
      this.tokenInfo = await this.getInitialToken();
    } else if (this.tokenInfo.expiration <= Date.now() + 3 * 60000) {
      this.tokenInfo =
          await this.getTokenWithRefreshToken(this.tokenInfo.refreshToken);
    }
    return this.tokenInfo.accessToken;
  }

  private getInitialToken(): Promise<TokenInfo> {
    return getTokenWithPassword(
        this.config.username,
        this.config.password,
        this.config.clientId,
        this.config.secret);
  }

  private getTokenWithRefreshToken(refreshToken: string): Promise<TokenInfo> {
    return getTokenWithRefreshToken(
        refreshToken,
        this.config.clientId,
        this.config.secret);
  }

  async getMessages(sinceMessage: string): Promise<Array<Message>> {
    return _getMessages(await this.getToken(), sinceMessage);
  }

  async markMessagesRead(ids: string[]): Promise<void> {
    return _markMessagesRead(
        await this.getToken(),
        ids);
  }

  async sendMessage(
      to: string,
      subject: string,
      body: string):
      Promise<void> {
    return _sendMessage(
        await this.getToken(),
        to,
        subject,
        body);
  }

  async transferDonuts(to: string, amount: number): Promise<string> {
    return _transferDonuts(await this.getToken(), to, amount);
  }
}
