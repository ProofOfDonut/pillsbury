import Typography from '@material-ui/core/Typography';
import {Theme, withStyles} from '@material-ui/core/styles';
import React, {PureComponent} from 'react';
import {Asset} from '../common/types/Asset';
import {SignedWithdrawal} from '../common/types/SignedWithdrawal';
import Module from '../components/Module';

const styles = (theme: Theme) => ({
  root: {
    maxWidth: 400,
  },
  table: {
    width: '100%',
    tableLayout: 'fixed' as 'fixed',
    fontSize: '94%',
  },
  rowBorder: {
    borderBottom: '1px solid #e0e0e0',
  },
  cell: {
    padding: '12px 0',
  },
  signature: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  amount: {
    width: 130,
    whiteSpace: 'nowrap' as 'nowrap',
    textAlign: 'right' as 'right',
  },
});

type PropTypes = {
  classes: {
    root: string;
    table: string;
    rowBorder: string;
    cell: string;
    signature: string;
    amount: string;
  };
  getPendingSignedWithdrawals: () => SignedWithdrawal[]|undefined;
  executeSignedWithdrawal: ((w: SignedWithdrawal) => void)|null;
  getAsset: (id: number) => Asset|undefined;
  className?: string;
};
type State = {};
class PendingSignedWithdrawals extends PureComponent<PropTypes, State> {
  render() {
    const withdrawals = this.props.getPendingSignedWithdrawals();
    if (!withdrawals) {
      return null;
    }
    const count = withdrawals.length;
    if (count == 0) {
      return null;
    }

    const classes = this.props.classes;
    return (
      <Module className={this.getClassName()}>
        <Typography variant="h5">
          Signed Withdrawals
        </Typography>
        <p>
          You have
          {count == 1 ? ' a signed withdrawal ' : ' some signed withdrawals '}
          which you haven't executed yet.
        </p>
        <table className={classes.table}>
          <tbody>
            {this.renderRows(withdrawals)}
          </tbody>
        </table>
      </Module>
    );
  }

  private getClassName(): string {
    const classes = this.props.classes;
    const classNames = [classes.root];
    if (this.props.className) {
      classNames.push(this.props.className);
    }
    return classNames.join(' ');
  }

  private renderRows(
      withdrawals: SignedWithdrawal[]) {
    const classes = this.props.classes;
    const out = [];
    const l = withdrawals.length
    for (let i = 0; i < l; i++) {
      const w = withdrawals[i];
      const asset = this.props.getAsset(w.assetId);
      if (asset) {
        out.push(
          <tr key={w.getSignature()}>
            <td className={this.getCellClassName(classes.signature, i, l)}>
              {this.renderSignature(w)}
            </td>
            <td className={this.getCellClassName(classes.amount, i, l)}>
              {asset.name.format(w.amount)}
            </td>
          </tr>
        );
      }
    }
    return out;
  }

  private getCellClassName(
      className: string,
      index: number,
      length: number):
      string {
    const classes = this.props.classes;
    const out = [classes.cell, className];
    if (index < length - 1) {
      out.push(classes.rowBorder);
    }
    return out.join(' ');
  }

  private renderSignature(w: SignedWithdrawal) {
    const execute = this.props.executeSignedWithdrawal;
    if (execute) {
      return (
        <a href="#"
           onClick={() => execute(w)}>
          {w.getSignature()}
        </a>
      );
    }
    return w.getSignature();
  }
}

export default withStyles(styles, {withTheme: true})(PendingSignedWithdrawals);
