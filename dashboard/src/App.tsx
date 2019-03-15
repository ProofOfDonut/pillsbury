import {Map} from 'immutable';
import {BrowserRouter as Router, Route} from 'react-router-dom';
import CssBaseline from '@material-ui/core/CssBaseline';
import Fade from '@material-ui/core/Fade';
import {Theme, withStyles} from '@material-ui/core/styles';
import React, {Fragment, PureComponent, ReactNode} from 'react';
import Chrome from './Chrome';
import {ensure} from './common/ensure';
import {Asset, AssetName, AssetSymbol} from './common/types/Asset';
import {Balances} from './common/types/Balances';
import {History} from './common/types/History';
import {User} from './common/types/User';
import {UserPermission} from './common/types/UserPermission';
import {UserTerm} from './common/types/UserTerm';
import {Withdrawal} from './common/types/Withdrawal';
import AdminPage from './pages/Admin';
import BalancesPage from './pages/Balances';
import DepositPage from './pages/Deposit';
import ErrorPage from './pages/Error';
import HistoryPage from './pages/History';
import LoginPage from './pages/Login';
import MaintenancePage from './pages/Maintenance';
import SplashPage from './pages/Splash';
import TransferPage from './pages/Transfer';
import UserTermsPage from './pages/UserTerms';
import WithdrawPage from './pages/Withdraw';
import Notice from './Notice';

const styles = {
  container: {
    position: 'absolute' as 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
};

type PropTypes = {
  classes: {
    container: string;
  };
  initialized: boolean;
  error: any;
  apiAvailable: boolean;
  csrfToken: string;
  pathname: string;
  setPathname: (pathname: string) => void;
  user: User|null;
  userPermissions: UserPermission[];
  logout: () => void;
  getAsset: (id: number) => Asset|undefined;
  getAssetBySymbol: (symbol: AssetSymbol) => Asset|undefined;
  asyncGetAssetBySymbol: (symbol: AssetSymbol) => Promise<Asset>;
  getPlatformBalances: (userId: string) => Balances|undefined;
  refreshPlatformBalances: (userId: string) => void;
  getMetaMaskBalance: (assetId: number) => Promise<number|null>;
  histories: Map<string, History>;
  depositTokens: ((asset: Asset, amount: number) => void)|null;
  getAvailableErc20Withdrawals: () => number|undefined;
  withdraw: (withdawal: Withdrawal) => Promise<void>;
  defaultWithdrawalAddress: string;
  getDepositId: () => Promise<string>;
  getContractAddress: () => Promise<string>;
  getRedditLoginConfig: () => [string, string]|undefined;
  getRedditHub: () => string;
  getSupportSubreddit: () => string;
  unacceptedUserTerms: UserTerm[];
  acceptUserTerm: (termId: number) => void;
  getAllUserTerms: () => UserTerm[];
  setUserTerms: (userTerms: UserTerm[]) => Promise<void>;
};
type State = {};
class App extends PureComponent<PropTypes, State> {
  unlistenFromHistory: () => void = () => {};

  constructor(props: PropTypes) {
    super(props);
  }

  render() {
    const classes = this.props.classes;
    return (
      <Fragment>
        <Router ref={this.updateRouter}>
          <CssBaseline />
          <Fade in mountOnEnter appear>
            <div className={classes.container}>
              {this.renderChrome()}
            </div>
          </Fade>
        </Router>
      </Fragment>
    );
  }

  private renderChrome() {
    if (!this.props.apiAvailable) {
      return <MaintenancePage />;
    }
    if (this.props.error) {
      return <ErrorPage error={this.props.error} />;
    }
    if (!this.props.initialized) {
      return <SplashPage />;
    }
    if (!this.props.user) {
      const redditLoginConfig = this.props.getRedditLoginConfig();
      if (redditLoginConfig) {
        const [redditClientId, redditRedirectUri] = redditLoginConfig;
        return <LoginPage
            csrfToken={this.props.csrfToken}
            redditClientId={redditClientId}
            redditRedirectUri={redditRedirectUri} />;
      } else {
        return <SplashPage />;
      }
    }
    if (this.props.unacceptedUserTerms.length > 0) {
      const term = this.props.unacceptedUserTerms[0];
      return <UserTermsPage
          title={term.title}
          text={term.text}
          acceptLabel={term.acceptLabel}
          accept={() => this.props.acceptUserTerm(term.id)} />;
    }
    return (
      <Chrome pathname={this.props.pathname}
              user={this.props.user}
              userPermissions={this.props.userPermissions}
              logout={this.props.logout}>
        {this.renderPage()}
      </Chrome>
    );
  }

  private renderPage() {
    return (
      <Fragment>
        <Route key="/"
               exact
               path="/"
               title="Balances"
               render={this.renderBalancesPage} />
        <Route key="/deposit"
               exact
               path="/deposit"
               title="Deposit"
               render={this.renderDepositPage} />
        <Route key="/withdraw"
               exact
               path="/withdraw"
               title="Withdraw"
               render={this.renderWithdrawPage} />
        <Route key="/transfer"
               exact
               path="/transfer"
               title="Transfer"
               component={TransferPage} />
        <Route key="/history"
               exact
               path="/history"
               title="History"
               component={HistoryPage} />
        <Route key="/admin"
               path="/admin"
               title="Admin"
               render={this.renderAdminPage} />
      </Fragment>
    );
  }

  private updateRouter = (ref: any) => {
    if (ref
        && ref.history
        && ref.history.listen
        && typeof ref.history.listen == 'function') {
       if (this.unlistenFromHistory) {
         this.unlistenFromHistory();
       }
       this.unlistenFromHistory = ref.history.listen((location: any) => {
         if (location && location.pathname) {
           this.props.setPathname(location.pathname);
         }
       })
    }
  }

  private renderBalancesPage = () => {
    const user = ensure(this.props.user);
    const balances = this.props.getPlatformBalances(user.id);
    return (
      <BalancesPage
          balances={balances}
          getAsset={this.props.getAsset}
          refreshBalances={this.refreshPlatformBalances} />
    );
  };

  private renderDepositPage = () => {
    const user = ensure(this.props.user);
    return (
      <DepositPage
          depositTokens={this.props.depositTokens}
          asyncGetAssetBySymbol={this.props.asyncGetAssetBySymbol}
          getMetaMaskBalance={this.props.getMetaMaskBalance}
          getDepositId={this.props.getDepositId}
          getContractAddress={this.props.getContractAddress}
          getRedditHub={this.props.getRedditHub}
          getSupportSubreddit={this.props.getSupportSubreddit} />
    );
  };

  private renderWithdrawPage = () => {
    const user = ensure(this.props.user);
    const balances = this.props.getPlatformBalances(user.id);
    return (
      <WithdrawPage
          user={user}
          getAsset={this.props.getAsset}
          getAvailableErc20Withdrawals={this.props.getAvailableErc20Withdrawals}
          withdraw={this.props.withdraw}
          defaultAddress={this.props.defaultWithdrawalAddress}
          balances={balances}
          refreshBalances={this.refreshPlatformBalances} />
    );
  };

  private renderAdminPage = () => {
    return (
      <AdminPage
          userPermissions={this.props.userPermissions}
          getAllUserTerms={this.props.getAllUserTerms}
          setUserTerms={this.props.setUserTerms} />
    );
  };

  private refreshPlatformBalances =
      () => this.props.refreshPlatformBalances(ensure(this.props.user).id);
}

export default withStyles(styles)(App);
