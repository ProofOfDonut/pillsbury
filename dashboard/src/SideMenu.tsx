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
import SwapHorizIcon from '@material-ui/icons/SwapHoriz';
import React, {PureComponent} from 'react';
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
};
type State = {};

class ResponsiveDrawer extends PureComponent<PropTypes, State> {
  render() {
    const { classes, theme } = this.props;

    // const drawer = (
    //   <div>
    //     <div className={classes.toolbar} />
    //     <Divider />
    //     <List>
    //       <RouteListItem to="/">
    //         <ListItemIcon><AccountBalanceWalletIcon /></ListItemIcon>
    //         <ListItemText primary="Balances" />
    //       </RouteListItem>
    //     </List>
    //     <Divider />
    //     <List>
    //       <RouteListItem to="/deposit">
    //         <ListItemIcon><MoveToInboxIcon /></ListItemIcon>
    //         <ListItemText primary="Deposit" />
    //       </RouteListItem>
    //       <RouteListItem to="/withdraw">
    //         <ListItemIcon><CloudUploadIcon /></ListItemIcon>
    //         <ListItemText primary="Withdraw" />
    //       </RouteListItem>
    //       <RouteListItem to="/transfer">
    //         <ListItemIcon><SwapHorizIcon /></ListItemIcon>
    //         <ListItemText primary="Transfer" />
    //       </RouteListItem>
    //     </List>
    //     <Divider />
    //     <List>
    //       <RouteListItem to="/history">
    //         <ListItemIcon><HistoryIcon /></ListItemIcon>
    //         <ListItemText primary="History" />
    //       </RouteListItem>
    //     </List>
    //   </div>
    // );

    const drawer = (
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
      </div>
    );

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
            {drawer}
          </Drawer>
        </Hidden>
        <Hidden xsDown implementation="css">
          <Drawer
              classes={{
                paper: classes.drawerPaper,
              }}
              variant="permanent"
              open>
            {drawer}
          </Drawer>
        </Hidden>
      </nav>
    );
  }
}

export default withStyles(styles, {withTheme: true})(ResponsiveDrawer);
