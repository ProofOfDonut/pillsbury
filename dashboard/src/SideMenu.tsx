import Divider from '@material-ui/core/Divider';
import Drawer from '@material-ui/core/Drawer';
import Hidden from '@material-ui/core/Hidden';
import List from '@material-ui/core/List';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import {Theme, withStyles} from '@material-ui/core/styles';
import AccountBalanceWalletIcon from '@material-ui/icons/AccountBalanceWallet';
import HistoryIcon from '@material-ui/icons/History';
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import MoveToInboxIcon from '@material-ui/icons/MoveToInbox';
import SettingsIcon from '@material-ui/icons/Settings';
import SwapHorizIcon from '@material-ui/icons/SwapHoriz';
import React, {Fragment, PureComponent} from 'react';
import {UserPermission} from './common/types/UserPermission';
import {RouteListItem} from './RouteListItem';

export const SIDE_MENU_WIDTH = 240;

const styles = (theme: Theme) => ({
  drawer: {
    [theme.breakpoints.up('sm')]: {
      width: SIDE_MENU_WIDTH,
      flexShrink: 0,
    },
  },
  toolbar: theme.mixins.toolbar,
  drawerPaper: {
    width: SIDE_MENU_WIDTH,
  },
});

type PropTypes = {
  classes: {
    toolbar: string;
    drawer: string;
    drawerPaper: string;
  };
  theme: Theme;
  mobileOpen: boolean;
  mobileClose: () => void;
  userPermissions: UserPermission[];
};
type State = {};

class ResponsiveDrawer extends PureComponent<PropTypes, State> {
  render() {
    const { classes, theme } = this.props;

    return (
      <nav className={classes.drawer}>
        <Hidden smUp implementation="css">
          <Drawer
              variant="temporary"
              anchor={theme.direction === 'rtl' ? 'right' : 'left'}
              open={this.props.mobileOpen}
              onClose={this.props.mobileClose}
              classes={{
                paper: classes.drawerPaper,
              }}
              ModalProps={{
                keepMounted: true, // Better open performance on mobile.
              }}>
            {this.renderDrawer()}
          </Drawer>
        </Hidden>
        <Hidden xsDown implementation="css">
          <Drawer
              classes={{
                paper: classes.drawerPaper,
              }}
              variant="permanent"
              open>
            {this.renderDrawer()}
          </Drawer>
        </Hidden>
      </nav>
    );
  }

  private renderDrawer() {
    const classes = this.props.classes;

    return (
      <div>
        <div className={classes.toolbar} />
        <Divider />
        <List>
          <RouteListItem to="/">
            <ListItemIcon><AccountBalanceWalletIcon /></ListItemIcon>
            <ListItemText primary="Balances" />
          </RouteListItem>
        </List>
        <Divider />
        <List>
          <RouteListItem to="/deposit">
            <ListItemIcon><MoveToInboxIcon /></ListItemIcon>
            <ListItemText primary="Deposit" />
          </RouteListItem>
          <RouteListItem to="/withdraw">
            <ListItemIcon><CloudUploadIcon /></ListItemIcon>
            <ListItemText primary="Withdraw" />
          </RouteListItem>
        </List>
        {this.renderAdminItem()}
      </div>
    );
  }

  private renderAdminItem() {
    if (this.props.userPermissions.includes(UserPermission.EDIT_USER_TERMS)
        || this.props.userPermissions.includes(UserPermission.EDIT_FEES)) {
      return (
        <Fragment>
          <Divider />
          <List>
            <RouteListItem to="/admin">
              <ListItemIcon><SettingsIcon /></ListItemIcon>
              <ListItemText primary="Admin" />
            </RouteListItem>
          </List>
        </Fragment>
      );
    }
  }
}

export default withStyles(styles, {withTheme: true})(ResponsiveDrawer);
