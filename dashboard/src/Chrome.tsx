import {Theme, withStyles} from '@material-ui/core/styles';
import React, {PureComponent, ReactNode} from 'react';
import AppBar from './AppBar';
import SideMenu from './SideMenu';
import {User} from './common/types/User';
import {UserPermission} from './common/types/UserPermission';

const styles = (theme: Theme) => ({
  container: {
    display: 'flex',
  },
  content: {
    flexGrow: 1,
  },
  toolbar: theme.mixins.toolbar,
});

type PropTypes = {
  classes: {
    container: string;
    content: string;
    toolbar: string;
  };
  pathname: string;
  user: User;
  userPermissions: UserPermission[];
  logout: () => void;
  children: ReactNode;
};
type State = {
  mobileOpen: boolean;
};
class Chrome extends PureComponent<PropTypes, State> {
  state = {
    mobileOpen: false,
  };

  render() {
    const classes = this.props.classes;
    return (
      <div className={classes.container}>
        <AppBar user={this.props.user}
                logout={this.props.logout}
                toggleMobileMenu={this.toggleMobileMenu} />
        <SideMenu mobileOpen={this.state.mobileOpen}
                  mobileClose={this.mobileClose}
                  userPermissions={this.props.userPermissions} />
        <div className={classes.content}>
          <div className={classes.toolbar} />
          {this.props.children}
        </div>
      </div>
    );
  }

  private toggleMobileMenu = () => {
    this.setState(state => ({mobileOpen: !state.mobileOpen}));
  };

  private mobileClose = () => {
    this.setState({mobileOpen: false});
  };
}

export default withStyles(styles, {withTheme: true})(Chrome);
