import CircularProgress from '@material-ui/core/CircularProgress';
import Paper from '@material-ui/core/Paper';
import {Theme, withStyles} from '@material-ui/core/styles';
import React, {PureComponent, ReactNode} from 'react';

export class ModuleStatus {
  busy: boolean;
  label: ReactNode;
  constructor(busy: boolean, label: ReactNode) {
    this.busy = busy;
    this.label = label;
  }
}

const styles = (theme: Theme) => ({
  root: {
    position: 'relative' as 'relative',
    ...theme.mixins.gutters(),
    paddingTop: theme.spacing.unit * 2,
    paddingBottom: theme.spacing.unit * 2,
    margin: theme.spacing.unit * 3,
  },
  mask: {
    position: 'absolute' as 'absolute',
    display: 'flex',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.unit * 2,
    background: '#fff',
    color: '#000',
    zIndex: 1,
    justifyContent: 'center',
  },
  maskContent: {
    alignSelf: 'center',
    overflow: 'auto',
  },
  label: {
    display: 'inline-block',
    verticalAlign: 'middle',
  },
  busyIcon: {
    margin: theme.spacing.unit,
    verticalAlign: 'middle',
  },
});

type PropTypes = {
  classes: {
    root: string;
    mask: string;
    maskContent: string;
    label: string;
    busyIcon: string;
  };
  className?: string;
  status?: ModuleStatus|null;
};
type State = {};
class Module extends PureComponent<PropTypes, State> {
  render() {
    const classes = this.props.classes;
    return (
      <Paper className={`${classes.root} ${this.props.className}`}>
        {this.renderStatus()}
        {this.props.children}
      </Paper>
    );
  }

  private renderStatus() {
    if (!this.props.status) {
      return null;
    }
    const classes = this.props.classes;
    return (
      <div className={classes.mask}>
        <div className={classes.maskContent}>
          {this.renderBusyIcon()}
          <div className={classes.label}>
            {this.props.status.label}
          </div>
        </div>
      </div>
    );
  }

  private renderBusyIcon() {
    const classes = this.props.classes;
    if (this.props.status && this.props.status.busy) {
      return <CircularProgress
          className={classes.busyIcon}
          size={16} />;
    }
  }
}

export default withStyles(styles, {withTheme: true})(Module);
