import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import {Theme, withStyles} from '@material-ui/core/styles';
import React, {PureComponent} from 'react';

const styles = {
  footer: {
    position: 'fixed' as 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    background: '#ff9',
    color: '#000',
    zIndex: 999999,
  },
};

type PropTypes = {
  classes: {
    footer: string;
  };
};
type State = {
  showDialog: boolean;
  showFooter: boolean;
};
class Notice extends PureComponent<PropTypes, State> {
  state = {
    showDialog: true,
    showFooter: true,
  };

  render() {
    if (localStorage.getItem('notice-seen')) {
      return this.renderFooter();
    }
    localStorage.setItem('notice-seen', '1');
    return this.renderDialog();
  }

  private renderDialog() {
    return (
      <Dialog
          open={this.state.showDialog}
          onClose={this.closeDialog}>
        <DialogTitle>Important Notice</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Withdrawals to ERC-20 tokens will be suspended indefinitely
            beginning with block 7,121,500. For more information, see the
            announcement at
            {' '}
            <a href="https://www.reddit.com/r/donuttrader/comments/aj6wfm/preparing_for_a_potential_halt_on_donut_transfers/"
              target="_blank">
              Preparing For A Potential Halt On Donut Transfers
            </a>.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={this.closeDialog} color="primary">
            Ok
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  private closeDialog = () => {
    this.setState({showDialog: false});
  };

  private renderFooter() {
    const classes = this.props.classes;
    if (this.state.showFooter) {
      return (
        <div className={classes.footer}>
          <b>Notice: </b>
          Withdrawals to ERC-20 tokens will be suspended indefinitely
          beginning with block 7,121,500.
          {' \u00a0 '}
          <a href="https://www.reddit.com/r/donuttrader/comments/aj6wfm/preparing_for_a_potential_halt_on_donut_transfers/"
            target="_blank">
            More Information
          </a>
          {' \u00a0 '}
          <a href="#"
            onClick={this.dismissFooter}>
            Dismiss
          </a>
        </div>
      );
    }
    return <div />;
  }

  private dismissFooter = () => {
    this.setState({showFooter: false});
  }
}

export default withStyles(styles)(Notice);
