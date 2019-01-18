import MaterialAppBar from '@material-ui/core/AppBar';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import {Theme, withStyles} from '@material-ui/core/styles';
import AccountCircle from '@material-ui/icons/AccountCircle';
import MenuIcon from '@material-ui/icons/Menu';
import React, {PureComponent} from 'react';
import {SIDE_MENU_WIDTH} from './SideMenu';
import {User} from './common/types/User';

const styles = (theme: Theme) => ({
  appBar: {
    zIndex: theme.zIndex.drawer + 1,
  },
  menuButton: {
    marginLeft: -12,
    marginRight: 20,
    [theme.breakpoints.up('sm')]: {
      display: 'none',
    },
  },
  grow: {
    flexGrow: 1,
  },
  titleContainer: {
    position: 'relative' as 'relative',
    display: 'inline-block',
  },
  beta: {
    position: 'absolute' as 'absolute',
    right: 0,
    marginTop: '-0.9em',
    fontSize: '80%',
    fontWeight: 400,
  },
  userInfo: {
    display: 'flex',
  },
  userButton: {
    cursor: 'pointer',
  },
  userIcon: {
    margin: '0 2px 2px 0',
    verticalAlign: 'middle',
  },
});

type PropTypes = {
  classes: {
    appBar: string;
    menuButton: string;
    grow: string;
    titleContainer: string;
    beta: string;
    userInfo: string;
    userButton: string;
    userIcon: string;
  };
  user: User;
  toggleMobileMenu: () => void;
  logout: () => void;
};
type State = {
  anchorEl: HTMLElement|null;
};

class AppBar extends PureComponent<PropTypes, State> {
  state = {
    anchorEl: null,
  };

  handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    this.setState({anchorEl: event.currentTarget});
  };

  handleClose = () => {
    this.setState({anchorEl: null});
  };

  logout = () => {
    this.props.logout();
    this.setState({anchorEl: null});
  };

  render() {
    const classes = this.props.classes;
    return (
      <MaterialAppBar className={classes.appBar}
                      position="fixed">
        <Toolbar>
          <IconButton className={classes.menuButton}
                      color="inherit"
                      aria-label="Menu"
                      onClick={this.props.toggleMobileMenu}>
            <MenuIcon />
          </IconButton>
          <div className={classes.grow}>
            <div className={classes.titleContainer}>
              <Typography variant="h6" color="inherit">
                Donut Dashboard
              </Typography>
              <Typography className={classes.beta} variant="body2" color="inherit">
                Beta
              </Typography>
            </div>
          </div>
          {this.renderUserMenu()}
        </Toolbar>
      </MaterialAppBar>
    );
  }

  private renderUserMenu() {
    const open = !!this.state.anchorEl;
    const classes = this.props.classes;
    if (this.props.user) {
      return (
        <div className={classes.userInfo}>
          <div
              className={classes.userButton}
              aria-owns={open ? 'menu-appbar' : undefined}
              aria-haspopup="true"
              onClick={this.handleMenu}>
            <AccountCircle className={classes.userIcon} />
            {' '}
            {this.props.user.username}
          </div>
          <Menu
              id="menu-appbar"
              anchorEl={this.state.anchorEl}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
              }}
              getContentAnchorEl={null}
              open={open}
              onClose={this.handleClose}>
            <MenuItem onClick={this.logout}>Logout</MenuItem>
          </Menu>
        </div>
      );
    }
  }
}

export default withStyles(styles, {withTheme: true})(AppBar);
