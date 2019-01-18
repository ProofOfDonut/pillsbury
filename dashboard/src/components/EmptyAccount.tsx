import {Theme, withStyles} from '@material-ui/core/styles';
import React, {PureComponent} from 'react';
import Module from '../components/Module';
import RefreshButton from './RefreshButton';

const styles = {
  root: {
    width: 'max-content',
  },
};

type PropTypes = {
  classes: {
    root: string;
  };
  refreshBalances: () => void;
};
type State = {};
class EmptyAccount extends PureComponent<PropTypes, State> {
  render() {
    const classes = this.props.classes;
    return (
      <Module className={classes.root}>
        <span>No balances</span>
        <RefreshButton refreshBalances={this.props.refreshBalances} />
      </Module>
    );
  }
}

export default withStyles(styles)(EmptyAccount);
