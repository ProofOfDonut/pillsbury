import Typography from '@material-ui/core/Typography';
import {Theme, withStyles} from '@material-ui/core/styles';
import InfoIcon from '@material-ui/icons/Info';
import React, {PureComponent} from 'react';
import Module from '../../components/Module';
import send01 from './send_01.png';

const styles = (theme: Theme) => ({
  root: {
    maxWidth: 880,
    marginTop: theme.spacing.unit * 2,
  },
  textContainer: {
    display: 'flex',
    flexDirection: 'column' as 'column',
    // This is the height of the floated image.
    minHeight: 410,
  },
  mainTextContainer: {
    flexGrow: 1,
  },
  infoIcon: {
    verticalAlign: 'middle',
  },
  imageContainer: {
    float: 'right' as 'right',
    marginLeft: 50,
  },
});

type PropTypes = {
  classes: {
    root: string;
    textContainer: string;
    mainTextContainer: string;
    infoIcon: string;
    imageContainer: string;
  };
  redditHub: string;
  supportSubreddit: string;
};
type State = {};
class RedditDepositInstructions extends PureComponent<PropTypes, State> {
  render() {
    const classes = this.props.classes;
    return (
      <Module className={classes.root}>
        <div className={classes.imageContainer}>
          <img src={send01} />
        </div>
        <div className={classes.textContainer}>
          <div className={classes.mainTextContainer}>
            <Typography variant="h5">
              Deposit /r/ethtrader Donuts
            </Typography>
            <p>
              To make a deposit from Reddit, send donuts to
              {' '}
              <b>/u/{this.props.redditHub}</b>.
              Any donuts received will be deposited to your account.
            </p>
            <p>
              To send donuts, go to
              {' '}
              <a href="https://new.reddit.com/r/ethtrader">/r/ethtrader</a>
              {' '}
              (in the new layout). Find the side module labelled "Subreddit Points",
              click on the "Send" button, enter the number of donuts you would like
              to deposit, and send them to <i>{this.props.redditHub}</i>.
            </p>
          </div>
          <p>
            Having trouble? Come to
            {' '}
            <a href={`https://www.reddit.com/r/${this.props.supportSubreddit}`}>
              /r/{this.props.supportSubreddit}
            </a>
            {' '}
            for support.
          </p>
        </div>
        <div style={{clear: 'right'}}></div>
      </Module>
    );
  }
}

export default withStyles(styles, {withTheme: true})(RedditDepositInstructions);
