import AppBar from '@material-ui/core/AppBar';
import Tab from '@material-ui/core/Tab';
import Tabs from '@material-ui/core/Tabs';
import {Theme, withStyles} from '@material-ui/core/styles';
import React, {ChangeEvent, PureComponent} from 'react';
import EthereumLogo from '../common/images/ethereum_logo.svg';
import RedditLogo from '../common/images/reddit_logo.svg';
import {AccountType} from '../common/types/Account';

const styles = (theme: Theme) => ({
  tabIcon: {
    height: 24,
  },
});

type PropTypes = {
  classes: {
    tabIcon: string;
  };
  value: AccountType;
  setValue: (accountType: AccountType) => void;
};
type State = {};
class AccountTypeBar extends PureComponent<PropTypes, State> {
  render() {
    const classes = this.props.classes;
    return (
      <AppBar position="static" color="default">
        <Tabs
            value={this.getTabNumber()}
            onChange={this.handleChange}
            indicatorColor="primary"
            textColor="primary">
          <Tab label="ERC-20 DONUTS"
              icon={<img className={classes.tabIcon}
                          src={EthereumLogo} />} />
          <Tab label="Reddit Donuts"
              icon={<img className={classes.tabIcon}
                          src={RedditLogo} />} />
        </Tabs>
      </AppBar>
    );
  }

  private getTabNumber(): number {
    switch (this.props.value) {
      case AccountType.ETHEREUM_ADDRESS:
        return 0;
      case AccountType.REDDIT_USER:
        return 1;
    }
    throw new Error(`Unknown account type (${this.props.value}).`);
  }

  private handleChange = (unused_event: ChangeEvent<{}>, tabNumber: any) => {
    switch (tabNumber) {
      case 0:
        this.props.setValue(AccountType.ETHEREUM_ADDRESS);
        break;
      default:
        this.props.setValue(AccountType.REDDIT_USER);
        break;
    }
  };
}

export default withStyles(styles, {withTheme: true})(AccountTypeBar);
