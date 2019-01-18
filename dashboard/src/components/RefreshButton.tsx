import IconButton from '@material-ui/core/IconButton';
import {Theme, withStyles} from '@material-ui/core/styles';
import RefreshIcon from '@material-ui/icons/Refresh';
import React, {PureComponent} from 'react';

const styles = {
  root: {
    margin: '0 2px',
  },
  tiny: {
    padding: 0,
  },
  tinyIcon: {
    width: 16,
    height: 16,
  },
};

type PropTypes = {
  classes: {
    root: string;
    tiny: string;
    tinyIcon: string;
  };
  refreshBalances: () => void;
  tiny?: boolean;
  className?: string;
};
type State = {};
class RefreshButton extends PureComponent<PropTypes, State> {
  static defaultProps = {
    tiny: false,
  };

  render() {
    const classes = this.props.classes;
    return (
      <IconButton className={this.getClassName()}
                  color="inherit"
                  onClick={this.props.refreshBalances}>
        <RefreshIcon className={this.getIconClassName()} />
      </IconButton>
    );
  }

  private getClassName(): string {
    const classes = this.props.classes;
    let className = classes.root;
    if (this.props.tiny) {
      className += ` ${classes.tiny}`;
    }
    if (this.props.className) {
      className += ` ${this.props.className}`;
    }
    return className;
  }

  private getIconClassName(): string {
    const classes = this.props.classes;
    if (this.props.tiny) {
      return classes.tinyIcon;
    }
    return '';
  }
}

export default withStyles(styles)(RefreshButton);
