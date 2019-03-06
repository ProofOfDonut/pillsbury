import Button from '@material-ui/core/Button';
import Checkbox from '@material-ui/core/Checkbox';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Typography from '@material-ui/core/Typography';
import {Theme, withStyles} from '@material-ui/core/styles';
import React, {ChangeEvent, PureComponent} from 'react';
import Module from '../components/Module';

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
});

type PropTypes = {
  classes: {
    root: string;
    text: string;
    buttons: string;
    spacer: string;
  };
  title: string;
  text: string;
  acceptLabel: string;
  accept: () => void;
};
type State = {
  accepted: boolean;
};
class UserTermsPage extends PureComponent<PropTypes, State> {
  state = {
    accepted: false,
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
          <Button variant="contained"
                  color="primary"
                  disabled={!this.state.accepted}
                  onClick={this.state.accepted ? this.props.accept : undefined}>
            Continue
          </Button>
        </div>
      </Module>
    );
  }

  private checkboxChanged = (event: ChangeEvent<HTMLInputElement>) => {
    this.setState({
      accepted: event.target.checked,
    });
  }
}

export default withStyles(styles, {withTheme: true})(UserTermsPage);
