import Button from '@material-ui/core/Button';
import {Theme, withStyles} from '@material-ui/core/styles';
import CheckIcon from '@material-ui/icons/Check';
import ErrorIcon from '@material-ui/icons/Error';
import React, {Fragment, PureComponent} from 'react';
import Module from '../components/Module';
import {ensure} from '../common/ensure';

const styles = (theme: Theme) => ({
  module: {
    maxWidth: 400,
    margin: '40px auto',
    padding: theme.spacing.unit * 2,
  },
  title: {
    fontWeight: 500,
  },
  errorIcon: {
    width: 18,
    height: 18,
    marginRight: 4,
    marginBottom: 2,
    fill: '#a00',
    verticalAlign: 'middle',
  },
  buttonContainer: {
    textAlign: 'center' as 'center',
  },
  check: {
    width: 20,
    height: 20,
    color: '#0a0',
  },
});

type PropTypes = {
  classes: {
    module: string;
    title: string;
    errorIcon: string;
    buttonContainer: string;
    check: string;
  };
  withdrawAllToReddit: (() => void)|null;
};
type State = {
  withdrawButtonClicked: boolean;
};
class GeoBlockedPage extends PureComponent<PropTypes, State> {
  state = {
    withdrawButtonClicked: false,
  };

  render() {
    const classes = this.props.classes;
    return (
      <Module className={classes.module}>
        <p className={classes.title}>
          <ErrorIcon className={classes.errorIcon} />
          Service is unavailable in your jurisdiction.
        </p>
        {this.renderWithdrawalLink()}
      </Module>
    );
  }

  private renderWithdrawalLink() {
    const classes = this.props.classes;
    if (this.props.withdrawAllToReddit) {
      return (
        <Fragment>
          <p>You may only withdraw any deposits you've made to Reddit.</p>
          <p className={classes.buttonContainer}>
            {this.renderWithdrawalButton()}
          </p>
        </Fragment>
      );
    }
  }

  private renderWithdrawalButton() {
    const classes = this.props.classes;
    if (this.state.withdrawButtonClicked) {
      return <CheckIcon className={classes.check} />;
    }
    return (
      <Button variant="contained"
              onClick={this.withdrawAllToReddit}>
        Withdraw All
      </Button>
    );
  }

  private withdrawAllToReddit = () => {
    this.setState({withdrawButtonClicked: true});
    ensure(this.props.withdrawAllToReddit)();
  };
}

export default withStyles(styles, {withTheme: true})(GeoBlockedPage);
