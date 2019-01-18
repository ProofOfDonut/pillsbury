import Typography from '@material-ui/core/Typography';
import {Theme, withStyles} from '@material-ui/core/styles';
import React, {PureComponent} from 'react';
import {Asset} from '../common/types/Asset';
import {Withdrawal} from '../common/types/Withdrawal';
import {User} from '../common/types/User';
import AmountControls from './AmountControls';
import Module, {ModuleStatus} from './Module';
import RefreshButton from './RefreshButton';

const styles = (theme: Theme) => ({
  root: {
    maxWidth: 450,
    marginTop: theme.spacing.unit * 2,
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
    accountInfo: string;
    refreshButton: string;
  };
  asset: Asset;
  balance: number;
  refreshBalances: () => void;
  user: User;
  withdraw: (amount: number) => Promise<Withdrawal>;
};
type State = {
  moduleStatus: ModuleStatus|null;
};
class WithdrawTokens extends PureComponent<PropTypes, State> {
  state = {
    moduleStatus: null,
  };

  render() {
    const classes = this.props.classes;
    return (
      <Module className={classes.root}
              status={this.state.moduleStatus}>
        <Typography variant="h5">
          Withdraw to Reddit
        </Typography>
        <p>
          Your donuts will be sent to <b>/u/{this.props.user.username}</b>.
        </p>
        <div>
          <AmountControls
              label="Withdraw"
              action={this.withdraw} />
        </div>
        <div className={classes.accountInfo}>
          {'Account balance: '}
          <b>{this.props.asset.name.format(this.props.balance)}</b>
          <RefreshButton
              className={classes.refreshButton}
              tiny={true}
              refreshBalances={this.props.refreshBalances} />
        </div>
      </Module>
    );
  }

  private withdraw = async (amount: number) => {
    await new Promise(resolve => {
      this.setState({
        moduleStatus: new ModuleStatus(true, 'Withdrawing...'),
      }, resolve);
    });
    const withdrawal = await this.props.withdraw(amount);
    this.setState({
      moduleStatus: new ModuleStatus(
          false,
          `Successfully withdrew `
          + `${withdrawal.asset.name.format(withdrawal.amount)} to `
          + `${withdrawal.to}.`),
    });
  };
}

export default withStyles(styles, {withTheme: true})(WithdrawTokens);
