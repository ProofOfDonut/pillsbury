import CircularProgress from '@material-ui/core/CircularProgress';
import IconButton from '@material-ui/core/IconButton';
import {Theme, withStyles} from '@material-ui/core/styles';
import RefreshIcon from '@material-ui/icons/Refresh';
import React, {PureComponent} from 'react';
import {ensure} from '../common/ensure';
import {Asset} from '../common/types/Asset';
import {Balances} from '../common/types/Balances';
import EmptyAccount from '../components/EmptyAccount';
import Module from '../components/Module';
import RefreshButton from '../components/RefreshButton';

const styles = (theme: Theme) => ({
  root: {
    display: 'grid',
    margin: theme.spacing.unit * 3,
  },
  balanceInfo: {
    width: 'max-content',
  },
});

type PropTypes = {
  classes: {
    root: string;
    balanceInfo: string;
  };
  balances: Balances|undefined;
  refreshBalances: () => void;
  getAsset: (id: number) => Asset|undefined;
};
type State = {};
class BalancesPage extends PureComponent<PropTypes, State> {
  render() {
    if (!this.props.balances) {
      return <CircularProgress />;
    }
    return (
      <div className={this.props.classes.root}>
        {this.renderBalances()}
      </div>
    );
  }

  private renderBalances() {
    const classes = this.props.classes;
    const out = [];
    const balances = ensure(this.props.balances);
    for (const assetId of balances.getAssetIds()) {
      const balance = balances.getPlatformValue(assetId);
      const asset = this.props.getAsset(assetId);
      if (asset) {
        out.push(
            <Module key={assetId}
                    className={classes.balanceInfo}>
              <span>You have {asset.name.format(balance)}.</span>
              <RefreshButton refreshBalances={this.props.refreshBalances} />
            </Module>);
      } else {
        out.push(
            <Module key={assetId}
                    className={classes.balanceInfo}>
              Loading...
            </Module>);
      }
    }
    if (out.length == 0) {
      return <EmptyAccount refreshBalances={this.props.refreshBalances} />;
    }
    return out;
  }
}

export default withStyles(styles, {withTheme: true})(BalancesPage);
