import CircularProgress from '@material-ui/core/CircularProgress';
import React, {PureComponent} from 'react';
import {AccountType} from '../common/types/Account';
import {Asset, AssetSymbol} from '../common/types/Asset';
import AccountTypeBar from '../components/AccountTypeBar';
import DepositTokens from '../components/DepositTokens';
import RedditDepositInstructions from '../components/RedditDepositInstructions';

type PropTypes = {
  depositTokens: ((asset: Asset, amount: number) => void)|null;
  asyncGetAssetBySymbol: (symbol: AssetSymbol) => Promise<Asset>;
  getMetaMaskBalance: (assetId: number) => Promise<number|null>;
  getDepositId: () => Promise<string>;
  getContractAddress: () => Promise<string>;
  getRedditHub: () => string;
  getSupportSubreddit: () => string;
};
type State = {
  selectedTab: AccountType;
};
class DepositPage extends PureComponent<PropTypes, State> {
  state = {
    selectedTab: AccountType.ETHEREUM_ADDRESS,
  };

  render() {
    return (
      <div>
        <AccountTypeBar
            value={this.state.selectedTab}
            setValue={this.setSelectedTab} />
        {this.state.selectedTab == AccountType.ETHEREUM_ADDRESS
            ? this.renderDepositTokens()
            : this.renderRedditDepositInstructions()}
      </div>
    );
  }

  private setSelectedTab = (selectedTab: AccountType) => {
    this.setState({selectedTab});
  };

  private renderDepositTokens() {
    return (
      <DepositTokens
          deposit={this.props.depositTokens}
          asyncGetAssetBySymbol={this.props.asyncGetAssetBySymbol}
          getMetaMaskBalance={this.props.getMetaMaskBalance}
          getDepositId={this.props.getDepositId}
          getContractAddress={this.props.getContractAddress} />
    );
  }

  private renderRedditDepositInstructions() {
    const redditHub = this.props.getRedditHub();
    const supportSubreddit = this.props.getSupportSubreddit();
    if (!redditHub || !supportSubreddit) {
      return <CircularProgress />
    }
    return (
      <RedditDepositInstructions
          redditHub={redditHub}
          supportSubreddit={supportSubreddit} />
    );
  }
}

export default DepositPage;
