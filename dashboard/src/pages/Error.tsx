import {Theme, withStyles} from '@material-ui/core/styles';
import ErrorIcon from '@material-ui/icons/Error';
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
    position: 'relative' as 'relative',
    maxWidth: 400,
    margin: '40px auto',
    padding: theme.spacing.unit * 2,
    paddingTop: theme.spacing.unit * 4,
  },
  error: {
    position: 'absolute' as 'absolute',
    top: 0,
    left: 0,
    marginRight: 4,
    padding: '2px 4px',
    fontWeight: 500,
    background: '#a00',
    color: '#fff',
    borderRadius: '2px 0 2px 0',
  },
  errorIcon: {
    width: 18,
    height: 18,
    marginRight: 4,
    marginBottom: 2,
    fill: '#fff',
    verticalAlign: 'middle',
  },
});

type PropTypes = {
  classes: {
    background: string;
    module: string;
    error: string;
    errorIcon: string;
  };
  error: any;
};
type State = {};
class ErrorPage extends PureComponent<PropTypes, State> {
  render() {
    const classes = this.props.classes;
    return (
      <div className={classes.background}>
        <Module className={classes.module}>
          <span className={classes.error}>
            <ErrorIcon className={classes.errorIcon} />
            Error
          </span>
          {String(this.props.error)}
        </Module>
      </div>
    );
  }
}

export default withStyles(styles, {withTheme: true})(ErrorPage);
