import React, {PureComponent} from 'react';
import {UserPermission} from '../../common/types/UserPermission';
import {UserTerm} from '../../common/types/UserTerm';
import AdminUserTermsPage from './UserTerms';

type PropTypes = {
  userPermissions: UserPermission[];
  getAllUserTerms: () => UserTerm[];
  setUserTerms: (userTerms: UserTerm[]) => Promise<void>;
};
type State = {};
class AdminPage extends PureComponent<PropTypes, State> {
  render() {
    if (this.props.userPermissions.includes(UserPermission.EDIT_USER_TERMS)) {
      return (
        <AdminUserTermsPage
            getAllUserTerms={this.props.getAllUserTerms}
            setUserTerms={this.props.setUserTerms} />
      );
    }
    return <div>You don't have any admin privileges.</div>;
  }
}

export default AdminPage;
