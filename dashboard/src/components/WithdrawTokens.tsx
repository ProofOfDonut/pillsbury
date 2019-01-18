import Typography from '@material-ui/core/Typography';
import {Theme, withStyles} from '@material-ui/core/styles';
import React, {PureComponent} from 'react';
import {Asset} from '../common/types/Asset';
import {Withdrawal} from '../common/types/Withdrawal';
import AddressLink from './AddressLink';
import AmountControls from './AmountControls';
import Erc20WithdrawalAddress from './Erc20WithdrawalAddress';
import Module, {ModuleStatus} from './Module';
import RefreshButton from './RefreshButton';

const styles = (theme: Theme) => ({
  root: {
    maxWidth: 450,
    marginTop: theme.spacing.unit * 2,
  },
  transactionInfo: {
    marginTop: '1em',
  },
  accountInfo: {
    fontSize: '85%',
  },
  refreshButton: {
    marginTop: -2,
  },
});

type PropTypes = {
  classes: {
    root: string;
    transactionInfo: string;
    accountInfo: string;
    refreshButton: string;
  };
  asset: Asset;
  balance: number;
  refreshBalances: () => void;
  availableErc20Withdrawals: number;
  withdraw: (address: string, amount: number) => Promise<Withdrawal>;
  defaultAddress: string;
};
type State = {
  address: string;
  moduleStatus: ModuleStatus|null;
};
class WithdrawTokens extends PureComponent<PropTypes, State> {
  constructor(props: PropTypes) {
    super(props);
    this.state = {
      address: props.defaultAddress,
      moduleStatus: null,
    };
  }

  componentWillReceiveProps(props: PropTypes) {
    if (this.state.address == '' && props.defaultAddress != '') {
      this.setState({
        address: props.defaultAddress,
      });
    }
  }

  render() {
    const classes = this.props.classes;
    return (
      <Module className={classes.root}
              status={this.state.moduleStatus}>
        <Typography variant="h5">
          Withdraw as ERC-20 DONUTS
        </Typography>
        <p>
          Enter your Ethereum address and the amount of DONUTS to withdraw.
        </p>
        <div>
          <Erc20WithdrawalAddress
              value={this.state.address}
              setValue={this.setAddress} />
        </div>
        <AmountControls
            label="Withdraw"
            action={this.withdrawAmount} />
        <div className={classes.accountInfo}>
          <div>
            {'Account balance: '}
            <b>{this.props.asset.name.format(this.props.balance)}</b>
            <RefreshButton
                className={classes.refreshButton}
                tiny={true}
                refreshBalances={this.props.refreshBalances} />
          </div>
          <div>
            {'Withdrawals remaining: '}
            <b>{this.props.availableErc20Withdrawals}</b>
          </div>
        </div>
      </Module>
    );
  }

  private setAddress = (address: string) => {
    this.setState({address});
  };

  private withdrawAmount = async (amount: number) => {
    await new Promise(resolve => {
      this.setState({
        moduleStatus: new ModuleStatus(true, 'Withdrawing...'),
      }, resolve);
    });
    const withdrawal = await this.props.withdraw(this.state.address, amount);
    this.setState({
      moduleStatus: new ModuleStatus(
          false,
          (<div>
            <div>
              Successfully withdrew
              {' '}{withdrawal.asset.name.format(withdrawal.amount)}{' to'}
              <br />
              <AddressLink address={withdrawal.to.toString()} />
            </div>
            {this.renderTransactionLink(withdrawal)}
          </div>)),
    });
  }

  private renderTransactionLink(withdrawal: Withdrawal) {
    const txId = withdrawal.transactionId;
    if (txId && !/^queued\-tx\:/.test(txId)) {
      return (
        <div className={this.props.classes.transactionInfo}>
          {'Transaction: '}
          <AddressLink type="transaction"
                      address={txId}
                      abbreviate={true} />
        </div>
      );
    } else {
      return (
        <div className={this.props.classes.transactionInfo}>
          It may take several minutes for the transaction be broadcasted and
          mined.
        </div>
      );
    }
  }
}

export default withStyles(styles, {withTheme: true})(WithdrawTokens);
