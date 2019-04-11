import {List, Map as ImmutableMap} from 'immutable';
import React, {PureComponent} from 'react';
import Web3 from 'web3';
import App from './App';
import {
  ensure,
  ensureEqual,
  ensureInEnum,
  ensureObject,
  ensurePropArray,
  ensurePropArrayOfType,
  ensurePropObject,
  ensurePropSafeInteger,
  ensurePropString,
} from './common/ensure';
import {HttpMethod, httpMethodToString} from './common/net/http_method';
import {Asset, AssetName, AssetSymbol} from './common/types/Asset';
import {Balances} from './common/types/Balances';
import {History} from './common/types/History';
import {SignedWithdrawal} from './common/types/SignedWithdrawal';
import {User} from './common/types/User';
import {UserPermission} from './common/types/UserPermission';
import {UserTerm} from './common/types/UserTerm';
import {Withdrawal} from './common/types/Withdrawal';
import {abi as TOKEN_ABI} from './contract_config';

// TODO: What's a better way to make this configurable?
const API_BASE =
    process.env.NODE_ENV == 'production'
        ? 'https://api.donut.dance'
        : location.protocol + '//' + location.hostname + ':3001';

// TODO: Can this type be imported from 'web3' somehow?
type Contract = {
  options: {address: string};
  methods: any;
};

type State = {
  initialized: boolean;
  error: any;
  apiAvailable: boolean;
  csrfToken: string;
  pathname: string;
  user: User|null;
  userPermissions: UserPermission[];
  assets: ImmutableMap<number, Asset>;
  getAsset: (id: number) => Asset|undefined;
  assetsBySymbol: ImmutableMap<AssetSymbol, number>;
  getAssetBySymbol: (symbol: AssetSymbol) => Asset|undefined;
  contractAddressByAssetId: ImmutableMap<number, string>;
  balances: ImmutableMap<string, Balances>;
  getPlatformBalances: (userId: string) => Balances|undefined;
  histories: ImmutableMap<string, History>;
  redditClientId: string;
  redditRedirectUri: string;
  getRedditLoginConfig: () => [string, string]|undefined;
  redditHub: string;
  getRedditHub: () => string;
  supportSubreddit: string;
  getSupportSubreddit: () => string;
  unacceptedUserTerms: UserTerm[];
  allUserTerms: UserTerm[]|null;
  getAllUserTerms: () => UserTerm[];
};
type PropTypes = {};
class AppData extends PureComponent<PropTypes, State> {
  private _web3: Web3|null = null;
  private ongoingGetRequests =
      new Map<string, Promise<{response: Response, data: Object}>>();

  state: State;

  constructor(props: PropTypes) {
    super(props);
    this.state = {
      initialized: false,
      error: null,
      apiAvailable: true,
      csrfToken: '',
      pathname: location.pathname,
      user: null,
      userPermissions: [],
      assets: ImmutableMap<number, Asset>(),
      getAsset: (id: number) => this.getAsset(id),
      assetsBySymbol: ImmutableMap<AssetSymbol, number>(),
      getAssetBySymbol: (symbol: AssetSymbol) => this.getAssetBySymbol(symbol),
      contractAddressByAssetId: ImmutableMap<number, string>(),
      balances: ImmutableMap<string, Balances>(),
      getPlatformBalances: (userId: string) => this.getPlatformBalances(userId),
      histories: ImmutableMap<string, History>(),
      redditClientId: '',
      redditRedirectUri: '',
      getRedditLoginConfig: () => this.getRedditLoginConfig(),
      redditHub: '',
      getRedditHub: () => this.getRedditHub(),
      supportSubreddit: '',
      getSupportSubreddit: () => this.getSupportSubreddit(),
      unacceptedUserTerms: [],
      allUserTerms: null,
      getAllUserTerms: () => this.getAllUserTerms(),
    };
    this.initialize();
  }

  private async initialize() {
    let csrfToken: string = '';
    try {
      csrfToken = await this.getCsrfToken();
    } catch (err) {
      this.setState({
        apiAvailable: false,
      });
      return;
    }
    await new Promise(resolve => {
      this.setState({csrfToken}, resolve);
    });
    await this.updateUser();
    this.setState({
      initialized: true,
    });
  }

  render() {
    return <App
        initialized={this.state.initialized}
        error={this.state.error}
        apiAvailable={this.state.apiAvailable}
        csrfToken={this.state.csrfToken}
        pathname={this.state.pathname}
        setPathname={this.setPathname}
        user={this.state.user}
        userPermissions={this.state.userPermissions}
        logout={this.logout}
        getAsset={this.state.getAsset}
        getAssetBySymbol={this.state.getAssetBySymbol}
        asyncGetAssetBySymbol={this.asyncGetAssetBySymbol}
        getPlatformBalances={this.state.getPlatformBalances}
        refreshPlatformBalances={this.refreshPlatformBalances}
        getWeb3ClientBalance={this.getWeb3ClientBalance}
        histories={this.state.histories}
        depositTokens={this.getTokenDepositer()}
        withdraw={this.withdraw}
        getDepositId={() => this.asyncGetDepositId(ensure(this.state.user).id)}
        getContractAddress={this.tmpAsyncGetDonutContractAddress}
        getRedditLoginConfig={this.state.getRedditLoginConfig}
        getRedditHub={this.state.getRedditHub}
        getSupportSubreddit={this.state.getSupportSubreddit}
        unacceptedUserTerms={this.state.unacceptedUserTerms}
        acceptUserTerm={this.acceptUserTerm}
        getAllUserTerms={this.state.getAllUserTerms}
        setUserTerms={this.setUserTerms}
        web3ClientDetected={!!this.web3} />;
  }

  private async getCsrfToken(): Promise<string> {
    const response = await this.apiRequest(HttpMethod.GET, '/user/csrf-token');
    return ensurePropString(response, 'token');
  }

  private async updateUser() {
    const response = await this.apiRequest(HttpMethod.GET, '/user/identity');
    await new Promise(async (resolve) => {
      // The 'user' property may be null.
      ensure(typeof (response as any)['user'] == 'object');
      const info = (response as any)['user'] as Object|null;
      const user = info ? User.fromJSON(info) : null;
      const userPermissions =
          ensurePropArray(response, 'permissions')
            .map(u => ensureInEnum<UserPermission>(UserPermission, u));
      let unacceptedUserTerms: UserTerm[] = [];
      if (user) {
        unacceptedUserTerms = await this.getUnacceptedUserTerms();
      }
      this.setState({
        user, userPermissions, unacceptedUserTerms,
      }, resolve);
    });
  }

  private logout = async () => {
    await this.apiRequest(HttpMethod.POST, '/user/logout');
    await this.updateUser();
  };

  private setPathname = (pathname: string) => {
    if (pathname == '/' && this.state.pathname != '/' && this.state.user) {
      // We're not doing a great job of tracking the current balance in-app. So
      // for now, just refresh whenever the Balances page is shown.
      this.setState({
        pathname,
        ...this.getRefreshPlatformBalancesState(this.state.user.id),
      })
    } else {
      this.setState({pathname});
    }
  };

  private getPlatformBalances = (userId: string): Balances|undefined => {
    const balances = this.state.balances.get(userId);
    if (!balances) {
      this.loadBalances(userId);
    }
    return balances;
  };

  private refreshPlatformBalances = (userId: string): void => {
    this.setState(this.getRefreshPlatformBalancesState(userId));
    this.loadBalances(userId);
  };

  private getRefreshPlatformBalancesState(userId: string) {
    return {
      balances: this.state.balances.delete(userId),
      getPlatformBalances: (userId: string) => this.getPlatformBalances(userId),
    };
  }

  private getWeb3ClientBalance =
      async (assetId: number):
      Promise<number|null> => {
    const web3 = this.web3;
    if (web3) {
      const [address, contract]: [string|null, Contract] = await Promise.all([
        this.getDefaultWeb3Address().catch(() => null),
        this.asyncGetAssetContract(web3, assetId),
      ]);
      if (address == null) {
        return null;
      }
      const [decimals, balance]: [string, string] = await Promise.all([
        contract.methods.decimals().call(),
        contract.methods.balanceOf(address).call(),
      ]);
      return +balance.toString().slice(0, -decimals);
    }
    return null;
  };

  private async loadBalances(userId: string): Promise<void> {
    const response =
        await this.apiRequest(HttpMethod.GET, `/user:${userId}/balances`);
    ensure(typeof (response as any)['balances'] == 'object');
    const info = (response as any)['balances'] as Object|null;
    this.setState({
      balances: this.state.balances.set(
          userId,
          info ? Balances.fromJSON(info) : Balances.empty),
      getPlatformBalances: (userId: string) => this.getPlatformBalances(userId),
    });
  }

  private getAsset = (id: number): Asset|undefined => {
    const asset = this.state.assets.get(id);
    if (!asset) {
      this.loadAsset(id);
    }
    return asset;
  };

  private async loadAsset(id: number): Promise<void> {
    const response =
        await this.apiRequest(HttpMethod.GET, `/asset:${id}`);
    await this.setAsset(response);
  }

  private getAssetBySymbol = (symbol: AssetSymbol): Asset|undefined => {
    const assetId = this.state.assetsBySymbol.get(symbol);
    if (!assetId) {
      this.loadAssetBySymbol(symbol);
      return;
    }
    const asset = this.state.assets.get(assetId);
    if (!asset) {
      this.loadAsset(assetId);
      return;
    }
    return asset;
  };

  private async loadAssetBySymbol(symbol: AssetSymbol): Promise<void> {
    const response =
        await this.apiRequest(HttpMethod.GET, `/asset:${symbol}`);
    await this.setAsset(response);
  }

  private asyncGetAssetBySymbol = async (
        symbol: AssetSymbol):
        Promise<Asset> => {
    if (!this.state.assetsBySymbol.has(symbol)) {
      await this.loadAssetBySymbol(symbol);
    }
    const assetId = ensure(this.state.assetsBySymbol.get(symbol)) as number;
    if (!this.state.assets.has(assetId)) {
      await this.loadAsset(assetId);
    }
    return ensure(this.state.assets.get(assetId)) as Asset;
  };

  private async setAsset(response: Object): Promise<void> {
    const info = ensurePropObject(response, 'asset');
    const asset = Asset.fromJSON(info);
    await new Promise(resolve => this.setState({
      assets: this.state.assets.set(asset.id, asset),
      getAsset: (id: number) => this.getAsset(id),
      assetsBySymbol: this.state.assetsBySymbol.set(asset.symbol, asset.id),
      getAssetBySymbol: (symbol: AssetSymbol) => this.getAssetBySymbol(symbol),
    }, resolve));
  };

  private tmpAsyncGetDonutContractAddress = async (): Promise<string> => {
    const asset = await this.asyncGetAssetBySymbol(AssetSymbol.DONUT);
    return this.asyncGetAssetContractAddress(asset.id);
  };

  private async asyncGetAssetContractAddress(assetId: number): Promise<string> {
    if (!this.state.contractAddressByAssetId.has(assetId)) {
      return this.loadAssetContractAddress(assetId);
    }
    return ensure(this.state.contractAddressByAssetId.get(assetId));
  }

  private async asyncGetAssetContract(
      web3: Web3,
      assetId: number):
      Promise<Contract> {
    const contractAddress = await this.asyncGetAssetContractAddress(assetId);
    return new web3.eth.Contract(TOKEN_ABI, contractAddress);
  }

  private async loadAssetContractAddress(assetId: number): Promise<string> {
    const response = ensureObject(
        await this.apiRequest(HttpMethod.GET, `/asset:${assetId}/contract`));
    const address = ensurePropString(ensureObject(response), 'address');
    this.setState({
      contractAddressByAssetId:
          this.state.contractAddressByAssetId.set(assetId, address),
    });
    return address;
  }

  private getTokenDepositer():
      ((asset: Asset, amount: number) => void)|null {
    const web3 = this.web3;
    if (web3) {
      return async (asset: Asset, amount: number) => {
        const [
          address,
          contract,
          depositId,
        ]: [string, Contract, string] = await Promise.all([
          this.getDefaultWeb3Address(),
          this.asyncGetAssetContract(web3, asset.id),
          this.asyncGetDepositId(ensure(this.state.user).id),
        ]);
        const decimals = await contract.methods.decimals().call();
        await this.web3Send(
            contract.methods.deposit(
                depositId,
                amount + '0'.repeat(+decimals)),
            {
              'from': address,
              'to': contract.options.address,
              'gas': 70000, // TODO: What's a good gas limit to use for this?
            });
        if (this.state.user) {
          this.loadBalances(this.state.user.id);
        }
      };
    }
    return null;
  }

  private async asyncGetDepositId(userId: number): Promise<string> {
    const response = ensureObject(
        await this.apiRequest(HttpMethod.GET, `/user:${userId}/deposit-id`));
    return ensurePropString(response, 'deposit_id');
  }

  private async getDefaultWeb3Address(): Promise<string> {
    const addresses = await ensure(this.web3).eth.getAccounts();
    return addresses[0];
  }

  private withdraw = async (
      withdrawal: Withdrawal):
      Promise<Withdrawal> => {
    const response = await this.apiRequest(
        HttpMethod.POST,
        `/asset:${withdrawal.asset.id}/withdraw:${withdrawal.amount}`,
        {
          'type': withdrawal.type,
          'username': withdrawal.username,
        });
    if (this.state.user) {
      this.loadBalances(this.state.user.id);
    }
    if ((response as any)['signed_withdrawal']) {
      const signedWithdrawal = SignedWithdrawal.fromJSON(
          ensurePropObject(response, 'signed_withdrawal'));
      const transactionId =
          await this.executeSignedWithdrawal(
              withdrawal.asset,
              signedWithdrawal);
      return new Withdrawal(
          withdrawal.type,
          withdrawal.username,
          withdrawal.asset,
          withdrawal.amount,
          '' /* messageId */,
          signedWithdrawal,
          transactionId);
    }
    ensureEqual(ensurePropString(response, 'message_id'), '');
    return withdrawal;
  };

  private async executeSignedWithdrawal(
      asset: Asset,
      signedWithdrawal: SignedWithdrawal):
      Promise<string> {
    const web3 = this.web3;
    if (!web3) {
      return '';
    }
    const [contract, address] = await Promise.all([
      this.asyncGetAssetContract(web3, asset.id),
      this.getDefaultWeb3Address(),
    ]);
    const decimals = await contract.methods.decimals().call();
    return this.web3Send(
        contract.methods.withdraw(
            signedWithdrawal.v,
            signedWithdrawal.r,
            signedWithdrawal.s,
            signedWithdrawal.nonce,
            signedWithdrawal.amount + '0'.repeat(decimals)),
        {
          from: address,
          to: contract.options.address,
          gas: 100000, // TODO: What's a good gas limit to use for this?
        });
  }

  private getRedditLoginConfig = (): [string, string]|undefined => {
    if (this.state.redditClientId) {
      return [
        this.state.redditClientId,
        ensure(this.state.redditRedirectUri),
      ];
    }
    this.updateRedditLoginConfig();
  };

  private async updateRedditLoginConfig() {
    const {redditClientId, redditRedirectUri} =
        await this.asyncGetRedditLoginConfig();
    this.setState({
      redditClientId,
      redditRedirectUri,
      getRedditLoginConfig: () => this.getRedditLoginConfig(),
    });
  }

  private async asyncGetRedditLoginConfig():
      Promise<{redditClientId: string, redditRedirectUri: string}> {
    const response = await this.apiRequest(HttpMethod.GET, '/reddit/config');
    ensureObject(response);
    return {
      redditClientId: ensurePropString(response, 'client_id'),
      redditRedirectUri: ensurePropString(response, 'redirect_uri'),
    };
  }

  private getRedditHub = (): string => {
    if (this.state.redditHub) {
      return this.state.redditHub;
    }
    this.updateRedditHub();
    return '';
  };

  private async updateRedditHub() {
    const redditHub = await this.asyncGetRedditHub();
    this.setState({
      redditHub,
      getRedditHub: () => this.getRedditHub(),
    });
  }

  private async asyncGetRedditHub(): Promise<string> {
    const response = await this.apiRequest(HttpMethod.GET, '/reddit/hub');
    ensureObject(response);
    return ensurePropString(response, 'username');
  }

  private getSupportSubreddit = (): string => {
    if (this.state.supportSubreddit) {
      return this.state.supportSubreddit;
    }
    this.updateSupportSubreddit();
    return '';
  };

  private async updateSupportSubreddit() {
    const supportSubreddit = await this.asyncGetSupportSubreddit();
    this.setState({
      supportSubreddit,
      getSupportSubreddit: () => this.getSupportSubreddit(),
    });
  }

  private async asyncGetSupportSubreddit(): Promise<string> {
    const response =
        await this.apiRequest(HttpMethod.GET, '/reddit/support-sub');
    ensureObject(response);
    return ensurePropString(response, 'subreddit');
  }

  private async apiRequest(
      method: HttpMethod,
      path: string,
      body: any = null):
      Promise<Object> {
    try {
      const fetchOptions = {
        'method': httpMethodToString(method),
        'headers': {
          'X-CSRF-Token': this.state.csrfToken,
        },
        'credentials': 'include' as 'include',
      };
      if (body) {
        (fetchOptions['headers'] as any)['Content-Type'] = 'application/json';
        (fetchOptions as any)['body'] = JSON.stringify(body);
      }
      const {response, data} =
          await this.fetch(method, `${API_BASE}${path}`, fetchOptions);
      if (response.status == 200) {
        return data;
      } else {
        this.setState({error: data});
        throw new Error('Failed API request: ' + (data as any)['message']);
      }
    } catch (error) {
      this.setState({error});
      throw error;
    }
  }

  private async fetch(
      method: HttpMethod,
      url: string,
      options: Object):
      Promise<{response: Response, data: Object}> {
    const key =
        method == HttpMethod.GET ? `${url}:${JSON.stringify(options)}`
        : '';
    if (key) {
      const ongoing = this.ongoingGetRequests.get(key);
      if (ongoing) {
        return ongoing;
      }
    }
    const promise = fetch(url, options).then(async (response: Response) => ({
      response,
      data: await response.json(),
    }));
    if (key) {
      this.ongoingGetRequests.set(key, promise);
    }
    const result = await promise;
    this.ongoingGetRequests.delete(key);
    const data = ensureObject(result);
    return result;
  }

  private get web3(): Web3|null {
    if (!this._web3) {
      let web3: Web3|null = null;
      const ethereum = (window as any)['ethereum'];
      if (ethereum) {
        web3 = new Web3(ethereum);
        ethereum.enable();
      } else if (Web3.givenProvider) {
        web3 = new Web3(Web3.givenProvider);
      }
      if (web3) {
        this._web3 = web3;
      } else {
        return null;
      }
    }
    return this._web3;
  }

  // This is being used to patch a bug (it seems to be a problem with Web3)
  // where the promise returned by the `send` method never resolves.
  private web3Send(
      tx: any,
      options: {from: string, to: string, gas: number}):
      Promise<string> {
    return new Promise(
        (resolve: (tranactionHash: string) => void,
         reject: (error: Error) => void) => {
      tx.send(options, (error: Error, transactionHash: string) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(transactionHash);
      });
    });
  }

  private async getUnacceptedUserTerms(): Promise<UserTerm[]> {
    const response = await this.apiRequest(
        HttpMethod.GET,
        '/user/terms:unaccepted');
    const terms =
        ensurePropArrayOfType(response, 'terms', 'object')
          .map(UserTerm.fromJSON);
    return terms;
  }

  private acceptUserTerm = async (termId: number) => {
    await this.apiRequest(
        HttpMethod.POST,
        `/user/terms:${termId}`,
        {'accept': true});
    this.setState({
      unacceptedUserTerms:
          this.state.unacceptedUserTerms.filter(u => u.id != termId),
    });
  };

  private getAllUserTerms(): UserTerm[] {
    const terms = this.state.allUserTerms;
    if (!terms) {
      this.updateAllUserTerms();
      return [];
    }
    return terms;
  }

  private async updateAllUserTerms() {
    const terms = await this.asyncGetAllUserTerms();
    this.setState({
      allUserTerms: terms,
      getAllUserTerms: () => this.getAllUserTerms(),
    });
  }

  private async asyncGetAllUserTerms():
      Promise<UserTerm[]> {
    const response = await this.apiRequest(
        HttpMethod.GET,
        '/user/terms:all');
    const terms =
        ensurePropArrayOfType(response, 'terms', 'object')
          .map(UserTerm.fromJSON);
    return terms;
  }

  private setUserTerms = async (terms: UserTerm[]) => {
    const response = await this.apiRequest(
        HttpMethod.PUT,
        `/user/terms:all`,
        {'terms': terms});
    const newTermIds: number[] =
        ensurePropArrayOfType(response, 'new_term_ids', 'number');
    let i = 0;
    this.setState({
      allUserTerms: terms.map(u => {
        if (u.id == 0) {
          return new UserTerm(
              newTermIds[i++],
              u.title,
              u.text,
              u.acceptLabel);
        }
        return u;
      }),
      getAllUserTerms: () => this.getAllUserTerms(),
    });
  };
}

export default AppData;
