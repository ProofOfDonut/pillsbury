import CircularProgress from '@material-ui/core/CircularProgress';
import React, {PureComponent, ReactNode} from 'react';
import {ensure, ensurePropString, ensureSafeInteger} from '../common/ensure';
import {AccountType} from '../common/types/Account';
import {Asset, AssetSymbol} from '../common/types/Asset';
import {Balances} from '../common/types/Balances';
import {Withdrawal, WithdrawalType} from '../common/types/Withdrawal';
import {User} from '../common/types/User';
import AccountTypeBar from '../components/AccountTypeBar';
import EmptyAccount from '../components/EmptyAccount';
import WithdrawReddit from '../components/WithdrawReddit';
import WithdrawTokens from '../components/WithdrawTokens';

type PropTypes = {
  user: User;
  getAsset: (id: number) => Asset|undefined;
  withdraw: (withdrawal: Withdrawal) => Promise<any>;
  balances: Balances|undefined;
  refreshBalances: () => void;
  web3ClientDetected: boolean;
};
type State = {
  selectedTab: AccountType;
};
class WithdrawPage extends PureComponent<PropTypes, State> {
  state = {
    selectedTab: AccountType.ETHEREUM_ADDRESS,
  };

  render() {
    return (
      <div>
        <AccountTypeBar
            value={this.state.selectedTab}
            setValue={this.setSelectedTab} />
        {this.renderWithdrawLoop(
            this.state.selectedTab == AccountType.ETHEREUM_ADDRESS
                ? this.renderWithdrawTokensForAsset
                : this.renderRedditWithdrawForAsset)}
      </div>
    );
  }

  private setSelectedTab = (selectedTab: AccountType) => {
    this.setState({selectedTab});
  };

  private renderWithdrawLoop(callback: (assetId: number) => ReactNode) {
    if (!this.props.balances) {
      return <CircularProgress />;
    }
    const r = [];
    for (const assetId of this.props.balances.getAssetIds()) {
      r.push(
        <div key={assetId}>
          {callback(assetId)}
        </div>
      );
    }
    if (r.length == 0) {
      return <EmptyAccount refreshBalances={this.props.refreshBalances} />;
    }
    return r;
  }

  private renderWithdrawTokensForAsset = (assetId: number) => {
    const asset = this.props.getAsset(assetId);
    const balance =
        ensureSafeInteger(
            ensure(this.props.balances).getPlatformValue(assetId));
    if (!asset) {
      return <CircularProgress />;
    }
    const withdraw = this.props.web3ClientDetected
        ? (amount: number) => this.withdrawErc20(asset, amount)
        : null;
    return (
      <WithdrawTokens
          asset={asset}
          balance={balance}
          refreshBalances={this.props.refreshBalances}
          withdraw={withdraw} />
    );
  };

  private renderRedditWithdrawForAsset = (assetId: number) => {
    const asset = this.props.getAsset(assetId);
    const balance =
        ensureSafeInteger(
            ensure(this.props.balances).getPlatformValue(assetId));
    if (!asset) {
      return <CircularProgress />;
    }
    return (
      <WithdrawReddit
          asset={asset}
          balance={balance}
          refreshBalances={this.props.refreshBalances}
          user={this.props.user}
          withdraw={(amount: number) => this.withdrawToReddit(asset, amount)} />
    );
  };

  private withdrawErc20 = (
      asset: Asset,
      amount: number):
      Promise<Withdrawal> => {
    return this.withdrawTo(
        WithdrawalType.ETHEREUM,
        '' /* username */,
        asset,
        amount);
  };

  private withdrawToReddit = async (
      asset: Asset,
      amount: number):
      Promise<Withdrawal> => {
    return this.withdrawTo(
        WithdrawalType.REDDIT,
        this.props.user.username,
        asset,
        amount);
  };

  private async withdrawTo(
      type: WithdrawalType,
      username: string,
      asset: Asset,
      amount: number):
      Promise<Withdrawal> {
    return this.props.withdraw(
        new Withdrawal(type, username, asset, amount));
  }
}

export default WithdrawPage;
