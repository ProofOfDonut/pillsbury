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
          getMetaMaskBalance={this.props.getMetaMaskBalance} />
    );
  }

  private renderRedditDepositInstructions() {
    return (
      <RedditDepositInstructions />
    );
  }
}

export default DepositPage;
