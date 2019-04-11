import throttle from 'lodash.throttle';
import Typography from '@material-ui/core/Typography';
import {Theme, withStyles} from '@material-ui/core/styles';
import ErrorIcon from '@material-ui/icons/Error';
import React, {PureComponent, ReactNode} from 'react';
import {ensure} from '../common/ensure';
import {Asset, AssetSymbol} from '../common/types/Asset';
import AmountControls from './AmountControls';
import Module, {ModuleStatus} from './Module';
import DepositTokensAdvanced from './DepositTokensAdvanced';
import Web3ClientNotDetected from './Web3ClientNotDetected';

const styles = (theme: Theme) => ({
  root: {
    marginTop: theme.spacing.unit * 2,
    transition: 'max-width 400ms',
  },
  rootCollapsed: {
    maxWidth: 450,
  },
  rootExpanded: {
    maxWidth: 600,
  },
  metaMaskBalance: {
    fontSize: '90%',
  },
  error: {
    width: 16,
    height: 16,
    marginRight: theme.spacing.unit,
    fill: '#c62828',
    verticalAlign: 'middle',
  }
});

type PropTypes = {
  classes: {
    root: string;
    rootCollapsed: string;
    rootExpanded: string;
    metaMaskBalance: string;
    error: string;
  };
  deposit: ((asset: Asset, amount: number) => void)|null;
  asyncGetAssetBySymbol: (symbol: AssetSymbol) => Promise<Asset>;
  getWeb3ClientBalance: (assetId: number) => Promise<number|null>;
  getDepositId: () => Promise<string>;
  getContractAddress: () => Promise<string>;
};
type State = {
  // -1 indicates loading
  // -2 indicates unknown
  metaMaskBalance: number;
  metaMaskBalanceFormatted: string;
  moduleStatus: ReactNode;
  expanded: boolean;
};
class DepositTokens extends PureComponent<PropTypes, State> {
  state = {
    metaMaskBalance: -1,
    metaMaskBalanceFormatted: '',
    moduleStatus: null,
    expanded: false,
  };

  render() {
    return (
      <Module className={this.getClassName()}
              status={this.state.moduleStatus}>
        <Typography variant="h5">
          Deposit ERC-20 DONUTS
        </Typography>
        <p>You can deposit donuts from your Web3 client.</p>
        {this.renderAmountControls()}
        <DepositTokensAdvanced
            getDepositId={this.props.getDepositId}
            getContractAddress={this.props.getContractAddress}
            enabled={this.state.expanded}
            enable={(expanded: boolean) => this.setState({expanded})} />
      </Module>
    );
  }

  private getClassName(): string {
    const classes = this.props.classes;
    if (this.state.expanded) {
      return `${classes.root} ${classes.rootExpanded}`;
    }
    return `${classes.root} ${classes.rootCollapsed}`;
  }

  private renderAmountControls() {
    if (this.props.deposit) {
      return (
        <div>
          <AmountControls
              label="Deposit"
              action={this.deposit} />
          {this.renderWeb3ClientBalance()}
        </div>
      );
    }
    return <Web3ClientNotDetected />
  }

  private renderWeb3ClientBalance() {
    const classes = this.props.classes;
    this.reloadWeb3ClientBalance();
    if (this.state.metaMaskBalance == -2) {
      return (
        <div>
          Could not determine Web3 client balance. (Is it locked?)
        </div>
      );
    }
    if (this.state.metaMaskBalance == -1) {
      return (
        <div>
          Loading Web3 client balance{'\u2026'}
        </div>
      );
    }
    return (
      <div className={classes.metaMaskBalance}>
        You have {this.state.metaMaskBalanceFormatted} in your Web3 client.
      </div>
    );
  }

  private async _reloadWeb3ClientBalance() {
    const asset = await this.props.asyncGetAssetBySymbol(AssetSymbol.DONUT);
    const balance = await this.props.getWeb3ClientBalance(asset.id);
    if (balance == null) {
      this.setState({metaMaskBalance: -2});
    } else {
      this.setState({
        metaMaskBalanceFormatted: asset.name.format(balance),
        metaMaskBalance: balance,
      });
    }
  }

  private reloadWeb3ClientBalance =
      throttle(this._reloadWeb3ClientBalance, 300);

  private deposit = async (amount: number) => {
    const classes = this.props.classes;
    await new Promise(resolve => {
      this.setState({
        moduleStatus: new ModuleStatus(
            false,
            <div>
              <p>Waiting for transaction{'\u2026'}</p>
              <p>
                <a href="#"
                   onClick={() => this.setState({moduleStatus: null})}>
                  Cancel
                </a>
              </p>
            </div>),
      }, resolve);
    });
    const asset = await this.props.asyncGetAssetBySymbol(AssetSymbol.DONUT);
    try {
      await ensure(this.props.deposit)(asset, amount);
    } catch (err) {
      this.setState({
        moduleStatus: new ModuleStatus(
            false,
            <div>
              <p>
                <ErrorIcon className={classes.error} />
                Error occurred:
              </p>
              {err && err.message ? <p>{err.message}</p> : null}
              <p>
                <a href="#"
                   onClick={() => this.setState({moduleStatus: null})}>
                  Try again
                </a>
              </p>
            </div>),
      });
      return;
    }
    this.setState({
      moduleStatus: new ModuleStatus(
          false,
          `Successfully deposited ${asset.name.format(amount)}.`),
    });
  };
}

export default withStyles(styles, {withTheme: true})(DepositTokens);
