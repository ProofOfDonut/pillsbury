import Typography from '@material-ui/core/Typography';
import {Theme, withStyles} from '@material-ui/core/styles';
import React, {PureComponent} from 'react';
import {Fee, FeeType} from '../../common/types/Fee';
import FeeEditor from '../../components/FeeEditor';
import Module from '../../components/Module';

const styles = (theme: Theme) => ({});

type PropTypes = {
  classes: {};
  erc20WithdrawalFee: Fee;
  setErc20WithdrawalFee: (fee: Fee) => void;
};
type State = {};
class AdminUserFeesPage extends PureComponent<PropTypes, State> {
  render() {
    const classes = this.props.classes;
    return (
      <Module>
        <Typography variant="h6">
          ERC-20 Withdrawal Fee
        </Typography>
        <FeeEditor
            value={this.props.erc20WithdrawalFee}
            setValue={this.props.setErc20WithdrawalFee} />
      </Module>
    );
  }
}

export default withStyles(styles, {withTheme: true})(AdminUserFeesPage);
