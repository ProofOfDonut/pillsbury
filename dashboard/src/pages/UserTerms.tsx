import Button from '@material-ui/core/Button';
import Checkbox from '@material-ui/core/Checkbox';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Typography from '@material-ui/core/Typography';
import {Theme, withStyles} from '@material-ui/core/styles';
import CheckIcon from '@material-ui/icons/Check';
import React, {ChangeEvent, PureComponent} from 'react';
import Module from '../components/Module';
import {ensure} from '../common/ensure';

const styles = (theme: Theme) => ({
  root: {
    maxWidth: 700,
    margin: '30px auto',
  },
  text: {
    margin: '16px 0',
    whiteSpace: 'pre-line' as 'pre-line',
  },
  buttons: {
    display: 'flex',
  },
  spacer: {
    flexGrow: 1,
  },
  check: {
    width: 20,
    height: 20,
    color: '#0a0',
  },
  withdrawAllLinkContainer: {
    marginTop: 8,
    fontSize: '90%',
    textAlign: 'center' as 'center',
  },
});

type PropTypes = {
  classes: {
    root: string;
    text: string;
    buttons: string;
    spacer: string;
    check: string;
    withdrawAllLinkContainer: string;
  };
  title: string;
  text: string;
  acceptLabel: string;
  accept: () => void;
  withdrawAllToReddit: (() => void)|null;
};
type State = {
  accepted: boolean;
  withdrawButtonClicked: boolean;
};
class UserTermsPage extends PureComponent<PropTypes, State> {
  state = {
    accepted: false,
    withdrawButtonClicked: false,
  };

  render() {
    const classes = this.props.classes;
    return (
      <Module className={classes.root}>
        <Typography variant="h5">
          {this.props.title}
        </Typography>
        <div className={classes.text}>
          {this.props.text}
        </div>
        <div className={classes.buttons}>
          <FormControlLabel
              label={this.props.acceptLabel}
              control={
                  <Checkbox checked={this.state.accepted}
                            onChange={this.checkboxChanged} />} />
          <div className={classes.spacer}></div>
          <div>
            <div>
              <Button
                  variant="contained"
                  color="primary"
                  disabled={!this.state.accepted}
                  onClick={this.state.accepted ? this.props.accept : undefined}>
                Continue
              </Button>
            </div>
            {this.renderWithdrawalLink()}
          </div>
        </div>
      </Module>
    );
  }

  private checkboxChanged = (event: ChangeEvent<HTMLInputElement>) => {
    this.setState({
      accepted: event.target.checked,
    });
  }

  private renderWithdrawalLink() {
    const classes = this.props.classes;
    if (this.state.withdrawButtonClicked) {
      return (
        <div className={classes.withdrawAllLinkContainer}>
          <CheckIcon className={classes.check} />
        </div>
      );
    }
    if (this.props.withdrawAllToReddit) {
      return (
        <div className={classes.withdrawAllLinkContainer}>
          <a href="#"
             onClick={this.withdrawAllToReddit}>
            Withdraw All
          </a>
        </div>
      );
    }
  }

  private withdrawAllToReddit = () => {
    this.setState({withdrawButtonClicked: true});
    ensure(this.props.withdrawAllToReddit)();
  };
}

export default withStyles(styles, {withTheme: true})(UserTermsPage);
