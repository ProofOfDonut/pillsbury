import IconButton from '@material-ui/core/IconButton';
import TextField from '@material-ui/core/TextField';
import {Theme, withStyles} from '@material-ui/core/styles';
import RefreshIcon from '@material-ui/icons/Refresh';
import React, {PureComponent, FocusEvent} from 'react';

// DEPRECATED.
// TODO: Delete this component?

const styles = {
  warning: {
    fontSize: '85%',
    background: '#fff0c0',
  },
  addressContainer: {
    display: 'flex',
  },
  address: {
    flex: '1',
    alignSelf: 'center',
  },
  icon: {
    height: 24,
  },
};

type PropTypes = {
  classes: {
    address: string;
    addressContainer: string;
    icon: string;
    warning: string;
  };
  address: string;
  generateNewAddress: () => void;
};
type State = {};
class Erc20DepositAddress extends PureComponent<PropTypes, State> {
  render() {
    const classes = this.props.classes;
    return (
      <div>
        <div className={classes.addressContainer}>
          <div className={classes.address}>
            <TextField
                value={this.props.address}
                onFocus={this.onTextFocus}
                fullWidth={true} />
          </div>
          <div>
            <IconButton
                title="Generate a new address"
                onClick={this.props.generateNewAddress}>
              <RefreshIcon className={classes.icon} />
            </IconButton>
          </div>
        </div>
        <div className={classes.warning}>
          Only send DONUT tokens to this address. Do not send ETH or other
          tokens or they will be lost.
        </div>
      </div>
    );
  }

  private onTextFocus = (event: FocusEvent<HTMLInputElement>) => {
    if (event.target) {
      event.target.select();
    }
  };
}

export default withStyles(styles, {withTheme: true})(Erc20DepositAddress);
