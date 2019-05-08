import AppBar from '@material-ui/core/AppBar';
import Tab from '@material-ui/core/Tab';
import Tabs from '@material-ui/core/Tabs';
import {Theme, withStyles} from '@material-ui/core/styles';
import React, {ChangeEvent, PureComponent} from 'react';
import {UserPermission} from '../common/types/UserPermission';

export enum AdminSubpage {
  TERMS,
  FEES,
}

const styles = (theme: Theme) => ({});

type PropTypes = {
  classes: {};
  userPermissions: UserPermission[];
  value: AdminSubpage;
  setValue: (value: AdminSubpage) => void;
};
type State = {};
class AdminSubpageBar extends PureComponent<PropTypes, State> {
  render() {
    const classes = this.props.classes;
    return (
      <AppBar position="static" color="default">
        <Tabs
            value={this.getTabNumber()}
            onChange={this.handleChange}
            indicatorColor="primary"
            textColor="primary">
          <Tab label="Terms"
               disabled={!this.allow(UserPermission.EDIT_USER_TERMS)} />
          <Tab label="Fees"
               disabled={!this.allow(UserPermission.EDIT_FEES)} />
        </Tabs>
      </AppBar>
    );
  }

  private getTabNumber(): number {
    switch (this.props.value) {
      case AdminSubpage.TERMS:
        return 0;
      case AdminSubpage.FEES:
        return 1;
    }
    throw new Error(`Unknown admin subpage (${this.props.value}).`);
  }
  
  private allow(permission: UserPermission): boolean {
    return this.props.userPermissions.includes(permission);
  }

  private handleChange = (unused_event: ChangeEvent<{}>, tabNumber: any) => {
    switch (tabNumber) {
      case 0:
        this.props.setValue(AdminSubpage.TERMS);
        break;
      default:
        this.props.setValue(AdminSubpage.FEES);
        break;
    }
  };
}

export default withStyles(styles, {withTheme: true})(AdminSubpageBar);
