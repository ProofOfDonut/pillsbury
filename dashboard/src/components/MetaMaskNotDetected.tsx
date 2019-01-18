import {Theme, withStyles} from '@material-ui/core/styles';
import ErrorIcon from '@material-ui/icons/Error';
import React, {PureComponent, ReactNode} from 'react';

const styles = (theme: Theme) => ({
  root: {
    width: 'max-content',
    padding: 8,
    background: '#c62828',
    color: '#fff',
  },
  errorIcon: {
    fill: '#fff',
    width: 16,
    height: 16,
    verticalAlign: 'middle',
  },
});

type PropTypes = {
  classes: {
    root: string;
    errorIcon: string;
  };
};
type State = {};
class MetaMaskNotDetected extends PureComponent<PropTypes, State> {
  render() {
    const classes = this.props.classes;
    return (
      <div className={classes.root}>
        <ErrorIcon className={classes.errorIcon} /> MetaMask not detected.
      </div>
    );
  }
}

export default withStyles(styles, {withTheme: true})(MetaMaskNotDetected);
