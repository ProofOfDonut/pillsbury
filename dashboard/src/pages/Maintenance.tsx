import {Theme, withStyles} from '@material-ui/core/styles';
import ErrorIcon from '@material-ui/icons/Error';
import React, {PureComponent} from 'react';
import Module from '../components/Module';

const styles = (theme: Theme) => ({
  module: {
    position: 'relative' as 'relative',
    maxWidth: 425,
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
    module: string;
    error: string;
    errorIcon: string;
  };
};
type State = {};
class MaintenancePage extends PureComponent<PropTypes, State> {
  render() {
    const classes = this.props.classes;
    return (
      <Module className={classes.module}>
        <span className={classes.error}>
          <ErrorIcon className={classes.errorIcon} />
          Error
        </span>
        Sorry, we've paused the Donut Dashboard for maintenance.{' '}
        Please try again later.
      </Module>
    );
  }
}

export default withStyles(styles, {withTheme: true})(MaintenancePage);
