import Typography from '@material-ui/core/Typography';
import {Theme, withStyles} from '@material-ui/core/styles';
import InfoIcon from '@material-ui/icons/Info';
import React, {PureComponent} from 'react';
import Module from '../../components/Module';
import send01 from './send_01.png';
import send02 from './send_02.png';

const styles = (theme: Theme) => ({
  root: {
    maxWidth: 880,
    marginTop: theme.spacing.unit * 2,
  },
  infoIcon: {
    verticalAlign: 'middle',
  },
  imageContainer: {
    textAlign: 'center' as 'center',
  },
  firstImage: {
    marginRight: 20,
  },
});

type PropTypes = {
  classes: {
    root: string;
    infoIcon: string;
    imageContainer: string;
    firstImage: string;
  };
};
type State = {};
class RedditDepositInstructions extends PureComponent<PropTypes, State> {
  render() {
    const classes = this.props.classes;
    return (
      <Module className={classes.root}>
        <Typography variant="h5">
          Deposit /r/ethtrader Donuts
        </Typography>
        <p>
          To make a deposit from Reddit, send donuts to <b>/u/ProofOfDonut</b>.
          Any donuts received will be deposited to your account.
        </p>
        <p>
          To send donuts, go to
          {' '}
          <a href="https://new.reddit.com/r/ethtrader">/r/ethtrader</a>
          {' '}
          (in the new layout). Find the side module labelled "Subreddit Points",
          click on the "Send" button, enter the number of donuts you would like
          to deposit, and send them to <i>ProofOfDonut</i>.
        </p>
        <p className={classes.imageContainer}>
          <img className={classes.firstImage} src={send01} />
          <img src={send02} />
        </p>
        <p>
          Having trouble? Send a message to
          {' '}
          <a href="https://www.reddit.com/message/compose/?to=ProofOfDonut">
            /u/ProofOfDonut
          </a>
          {' '}
          for support.
        </p>
      </Module>
    );
  }
}

export default withStyles(styles, {withTheme: true})(RedditDepositInstructions);
