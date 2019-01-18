import Button from '@material-ui/core/Button';
import {Theme, withStyles} from '@material-ui/core/styles';
import React, {PureComponent} from 'react';
import RedditLogoRedImage from '../../common/images/reddit_logo_red.svg';
import Module from '../Module';
import dogenutImage from './dogenut.jpg';

const styles = (theme: Theme) => ({
  module: {
    display: 'flex',
    margin: '40px auto',
    maxWidth: 730,
    [theme.breakpoints.down('sm')]: {
      maxWidth: 380,
    },
  },
  copy: {
    alignSelf: 'center',
  },
  dogenut: {
    width: 300,
    [theme.breakpoints.down('sm')]: {
      display: 'none',
    },
  },
  redditLogo: {
    height: 24,
    marginRight: 6,
    verticalAlign: 'middle',
  },
  buttonContainer: {
    textAlign: 'center' as 'center',
    color: 'rgb(255, 69, 0)',
  },
});

type PropTypes = {
  classes: {
    module: string;
    copy: string;
    dogenut: string;
    redditLogo: string;
    buttonContainer: string;
  };
  loginUrl: string;
};
type State = {};
class Introduction extends PureComponent<PropTypes, State> {
  render() {
    const classes = this.props.classes;
    return (
      <Module className={classes.module}>
        <div>
          <img className={classes.dogenut}
              src={dogenutImage} />
        </div>
        <div className={classes.copy}>
          <p>
            Use this app to deposit your /r/ethtrader Donuts and withdraw them
            as ERC-20 tokens to your Ethereum Address!
          </p>
          <p>
            To get started, sign in using your Reddit account.
          </p>
          <p className={classes.buttonContainer}>
            <Button color="inherit"
                    onClick={this.signIn}>
              <img src={RedditLogoRedImage}
                  className={classes.redditLogo} />
              Sign In
            </Button>
          </p>
        </div>
      </Module>
    );
  }

  private signIn = () => {
    window.location.href = this.props.loginUrl;
  };
}

export default withStyles(styles, {withTheme: true})(Introduction);
