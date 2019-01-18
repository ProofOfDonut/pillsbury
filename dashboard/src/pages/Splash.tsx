import CircularProgress from '@material-ui/core/CircularProgress';
import {Theme, withStyles} from '@material-ui/core/styles';
import React, {PureComponent} from 'react';
import Module from '../components/Module';

const styles = (theme: Theme) => ({
  background: {
    position: 'absolute' as 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    background: '#f5f5f5',
  },
  module: {
    width: 200,
    margin: '40px auto',
    padding: theme.spacing.unit * 2,
    fontSize: '120%',
  },
  progress: {
    margin: theme.spacing.unit * 2,
    verticalAlign: 'middle',
  },
});

type PropTypes = {
  classes: {
    background: string;
    module: string;
    progress: string;
  };
};
type State = {};
class SplashPage extends PureComponent<PropTypes, State> {
  render() {
    const classes = this.props.classes;
    return (
      <div className={classes.background}>
        <Module className={classes.module}>
          <CircularProgress
              className={classes.progress}
              size={24} />
          Loading{'\u2026'}
        </Module>
      </div>
    );
  }
}

export default withStyles(styles, {withTheme: true})(SplashPage);
