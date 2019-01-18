import {List, Map} from 'immutable';
import React, {PureComponent} from 'react';
import Web3 from 'web3';
import App from './App';
import {
  ensure, ensureObject, ensurePropNumber, ensurePropObject, ensurePropString,
} from './common/ensure';
import {HttpMethod, httpMethodToString} from './common/net/http_method';
import {Asset, AssetName, AssetSymbol} from './common/types/Asset';
import {Balances} from './common/types/Balances';
import {History} from './common/types/History';
import {User} from './common/types/User';
import {Withdrawal} from './common/types/Withdrawal';
import {DEPOSITABLE_ABI} from './config';

const API_BASE =
    process.env.NODE_ENV == 'production'
        ? 'https://api.donut.dance'
        : 'http://192.168.56.102:3001';

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
  assets: Map<number, Asset>;
  getAsset: (id: number) => Asset|undefined;
  assetsBySymbol: Map<AssetSymbol, number>;
  getAssetBySymbol: (symbol: AssetSymbol) => Asset|undefined;
  contractAddressByAssetId: Map<number, string>;
  balances: Map<string, Balances>;
  getPlatformBalances: (userId: string) => Balances|undefined;
  availableErc20Withdrawals: number|undefined;
  getAvailableErc20Withdrawals: () => number|undefined;
  histories: Map<string, History>;
  defaultWithdrawalAddress: string;
};
type PropTypes = {};
class AppData extends PureComponent<PropTypes, State> {
  private _web3: Web3|null = null;

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
      assets: Map<number, Asset>(),
      getAsset: (id: number) => this.getAsset(id),
      assetsBySymbol: Map<AssetSymbol, number>(),
      getAssetBySymbol: (symbol: AssetSymbol) => this.getAssetBySymbol(symbol),
      contractAddressByAssetId: Map<number, string>(),
      balances: Map<string, Balances>(),
      getPlatformBalances: (userId: string) => this.getPlatformBalances(userId),
      availableErc20Withdrawals: undefined,
      getAvailableErc20Withdrawals: () => this.getAvailableErc20Withdrawals(),
      histories: Map<string, History>(),
      defaultWithdrawalAddress: '',
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
    let defaultWithdrawalAddress: string = '';
    try {
      defaultWithdrawalAddress = await this.getDefaultWeb3Address();
    } catch (e) {}
    this.setState({
      initialized: true,
      defaultWithdrawalAddress,
    });
  }

  render() {
    return (
      <App
          initialized={this.state.initialized}
          error={this.state.error}
          apiAvailable={this.state.apiAvailable}
          csrfToken={this.state.csrfToken}
          pathname={this.state.pathname}
          setPathname={this.setPathname}
          user={this.state.user}
          logout={this.logout}
          getAsset={this.state.getAsset}
          getAssetBySymbol={this.state.getAssetBySymbol}
          asyncGetAssetBySymbol={this.asyncGetAssetBySymbol}
          getPlatformBalances={this.state.getPlatformBalances}
          refreshPlatformBalances={this.refreshPlatformBalances}
          getMetaMaskBalance={this.getMetaMaskBalance}
          histories={this.state.histories}
          depositTokens={this.getTokenDepositer()}
          getAvailableErc20Withdrawals={this.state.getAvailableErc20Withdrawals}
          withdraw={this.withdraw}
          defaultWithdrawalAddress={this.state.defaultWithdrawalAddress} />
    );
  }

  private async getCsrfToken(): Promise<string> {
    const response = await this.apiRequest(HttpMethod.GET, '/user/csrf-token');
    return ensurePropString(response, 'token');
  }

  private async updateUser() {
    const response = await this.apiRequest(HttpMethod.GET, '/user/identity');
    await new Promise(resolve => {
      ensure(typeof (response as any)['user'] == 'object');
      const info = (response as any)['user'] as Object|null;
      this.setState({
        user: info ? User.fromJSON(info) : null,
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

  private getMetaMaskBalance =
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
      return +balance.slice(0, -decimals);
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
    return new web3.eth.Contract(DEPOSITABLE_ABI, contractAddress);
  }

  private async loadAssetContractAddress(assetId: number): Promise<string> {
    const response = ensureObject(
        await this.apiRequest(HttpMethod.GET, `/asset:${assetId}/contract`));
    const info = ensurePropObject(ensureObject(response), 'contract');
    const address = ensurePropString(info, 'address');
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
        const response =
            await contract.methods.deposit(
                depositId,
                amount + '0'.repeat(+decimals))
              .send({
                'from': address,
                'to': contract.options.address,
                'value': '0x0',
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

  private getAvailableErc20Withdrawals(): number|undefined {
    this.asyncGetAvailableErc20Withdrawals()
      .then(available => {
        if (available != this.state.availableErc20Withdrawals) {
          this.setState({
            availableErc20Withdrawals: available,
            getAvailableErc20Withdrawals:
                () => this.getAvailableErc20Withdrawals(),
          });
        }
      });
    return this.state.availableErc20Withdrawals;
  }

  private async asyncGetAvailableErc20Withdrawals(): Promise<number> {
    if (!this.state.user) {
      return 0;
    }
    const response = await this.apiRequest(
        HttpMethod.GET,
        `/user:${this.state.user.id}/available-erc20-withdrawals`);
    return ensurePropNumber(response, 'available');
  }

  private withdraw = async (withdrawal: Withdrawal): Promise<any> => {
    const response = await this.apiRequest(
        HttpMethod.POST,
        `/asset:${withdrawal.asset.id}/withdraw:${withdrawal.amount}`,
        {'to': withdrawal.to});
    if (this.state.user) {
      this.loadBalances(this.state.user.id);
    }
    return response;
  };

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
      const result = await fetch(API_BASE + path, fetchOptions);
      const data = ensureObject(await result.json());
      if (result.status == 200) {
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

  private get web3(): Web3|null {
    if (!this._web3) {
      let web3: Web3|null = null;
      let ready: Promise<void>|null = null;
      const ethereum = (window as any)['ethereum'];
      if (ethereum) {
        web3 = new Web3(ethereum);
        ready = ethereum.enable();
      } else if (Web3.givenProvider) {
        web3 = new Web3(Web3.givenProvider);
      }
      if (web3) {
        this._web3 = web3;
        if (ready) {
          ready.then(() => this.updateDefaultWithdrawalAddress());
        } else {
          this.updateDefaultWithdrawalAddress();
        }
      } else {
        return null;
      }
    }
    return this._web3;
  }

  private async updateDefaultWithdrawalAddress() {
    try {
      const defaultWithdrawalAddress = await this.getDefaultWeb3Address();
      this.setState({defaultWithdrawalAddress});
    } catch (e) {}
  }
}

export default AppData;
