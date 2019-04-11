import CircularProgress from '@material-ui/core/CircularProgress';
import {Theme, withStyles} from '@material-ui/core/styles';
import React, {PureComponent} from 'react';
import {ensure} from '../common/ensure';
import {abi as DEPOSITABLE_ABI} from '../contract_config';
import Module, {ModuleStatus} from './Module';

const styles = (theme: Theme) => ({
  root: {
    marginTop: theme.spacing.unit * 2,
  },
  title: {
    fontWeight: 500,
  },
  abi: {
    width: '100%',
    height: 120,
  },
  advancedInstructions: {
    fontSize: '85%',
  },
  detail: {
    margin: '8px 0',
  },
});

type PropTypes = {
  classes: {
    root: string;
    title: string;
    abi: string;
    advancedInstructions: string;
    detail: string;
  };
  getDepositId: () => Promise<string>;
  getContractAddress: () => Promise<string>;
  enabled: boolean;
  enable: (enabled: boolean) => void;
};
type State = {
  depositId: string;
  contractAddress: string;
};
class DepositTokensAdvanced extends PureComponent<PropTypes, State> {
  state = {
    depositId: '',
    contractAddress: '',
  };

  private loadingContractAddress: boolean = false;
  private loadingDepositId: boolean = false;

  render() {
    const classes = this.props.classes;
    return (
      <div className={classes.root}>
        <div>
          <span className={classes.title}>Avanced Deposits</span>
          {' '}
          {this.renderEnable()}
        </div>
        <div className={classes.advancedInstructions}>
          You can use this if you don't have access to a Web3 client like
          MetaMask. This deposit method is for advanced users who know what
          they're doing.
        </div>
        {this.renderInstructions()}
      </div>
    );
  }

  private renderEnable() {
    if (!this.props.enabled) {
      return (
        <a href="#"
            onClick={() => this.props.enable(true)}>
          Enable
        </a>
      );
    }
    return null;
  }

  private renderInstructions() {
    const classes = this.props.classes;
    if (this.props.enabled) {
      return (
        <div>
          <p>
            You can make a deposit by calling the contract's
            {' '}
            <code>deposit</code>
            {' '}
            function. The deposit function takes a deposit ID which is used to
            associate the deposit to your account. Your deposit ID is shown below.
            {' '}
            <i>Make sure to copy the deposit ID correctly.</i>
          </p>
          <div className={classes.detail}>
            <b>Contract Address: </b>
            {this.renderContractAddress()}
          </div>
          <div className={classes.detail}>
            <div><b>Contract ABI:</b></div>
            <textarea
                className={classes.abi}
                value={JSON.stringify(DEPOSITABLE_ABI)}
                readOnly={true} />
          </div>
          <div className={classes.detail}>
            <b>Deposit ID: </b>
            {this.renderDepositId()}
          </div>
        </div>
      );
    }
    return null;
  }

  private renderContractAddress() {
    if (this.state.contractAddress) {
      return this.state.contractAddress;
    }
    this.loadContractAddress();
    return <CircularProgress />;
  }

  private async loadContractAddress() {
    if (this.loadingContractAddress) {
      return;
    }
    this.loadingContractAddress = true;
    this.setState({
      contractAddress: await this.props.getContractAddress(),
    });
  }

  private renderDepositId() {
    if (this.state.depositId) {
      return this.state.depositId;
    }
    this.loadDepositId();
    return <CircularProgress />;
  }

  private async loadDepositId() {
    if (this.loadingDepositId) {
      return;
    }
    this.loadingDepositId = true;
    this.setState({
      depositId: await this.props.getDepositId(),
    });
  }
}

export default withStyles(styles, {withTheme: true})(DepositTokensAdvanced);
