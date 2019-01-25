import Typography from '@material-ui/core/Typography';
import {Theme, withStyles} from '@material-ui/core/styles';
import React, {PureComponent} from 'react';
import {Asset} from '../common/types/Asset';
import {Withdrawal} from '../common/types/Withdrawal';
import Erc20WithdrawalAddress from './Erc20WithdrawalAddress';
import Module, {ModuleStatus} from './Module';

const styles = (theme: Theme) => ({
  root: {
    maxWidth: 450,
    marginTop: theme.spacing.unit * 2,
  },
  notice: {
    padding: 12,
    background: '#ff9',
    color: '#000',
  },
});

type PropTypes = {
  classes: {
    root: string;
    notice: string;
  };
};
type State = {};
class WithdrawTokensDisabled extends PureComponent<PropTypes, State> {
  render() {
    const classes = this.props.classes;
    return (
      <Module className={classes.root}>
        <Typography variant="h5">
          Withdraw as ERC-20 DONUTS
        </Typography>
        <div className={classes.notice}>
          <p>
            Withdrawals to ERC-20 tokens are currently disabled indefinitely.
            For more information, see the announcement at
            {' '}
            <a href="https://www.reddit.com/r/donuttrader/comments/aj6wfm/preparing_for_a_potential_halt_on_donut_transfers/"
              target="_blank">
              Preparing For A Potential Halt On Donut Transfers
            </a>.
          </p>
        </div>
      </Module>
    );
  }
}

export default withStyles(styles, {withTheme: true})(WithdrawTokensDisabled);
