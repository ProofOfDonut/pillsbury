import CircularProgress from '@material-ui/core/CircularProgress';
import React, {Fragment, PureComponent} from 'react';
import {Fee} from '../../common/types/Fee';
import {UserPermission} from '../../common/types/UserPermission';
import {UserTerm} from '../../common/types/UserTerm';
import AdminSubpageBar, {AdminSubpage} from '../../components/AdminSubpageBar';
import AdminUserFeesPage from './UserFees';
import AdminUserTermsPage from './UserTerms';

type PropTypes = {
  userPermissions: UserPermission[];
  getAllUserTerms: () => UserTerm[];
  setUserTerms: (userTerms: UserTerm[]) => Promise<void>;
  getErc20WithdrawalFee: () => Fee|undefined;
  setErc20WithdrawalFee: (fee: Fee) => void;
};
type State = {
  subpage: AdminSubpage,
};
class AdminPage extends PureComponent<PropTypes, State> {
  state = {
    subpage: AdminSubpage.TERMS,
  };

  render() {
    return (
      <Fragment>
        <AdminSubpageBar
            userPermissions={this.props.userPermissions}
            value={this.state.subpage}
            setValue={this.setSubpage} />
        {this.renderSubpage()}
      </Fragment>
    );
  }

  private renderSubpage() {
    switch (this.state.subpage) {
      case AdminSubpage.TERMS:
        return (
          <AdminUserTermsPage
              getAllUserTerms={this.props.getAllUserTerms}
              setUserTerms={this.props.setUserTerms} />
        );
      case AdminSubpage.FEES:
        const erc20WithdrawalFee = this.props.getErc20WithdrawalFee();
        if (!erc20WithdrawalFee) {
          return <CircularProgress />;
        }
        return (
          <AdminUserFeesPage
              erc20WithdrawalFee={erc20WithdrawalFee}
              setErc20WithdrawalFee={this.props.setErc20WithdrawalFee} />
        );
    }
    throw new Error(`Unknown admin subpage (${this.state.subpage}).`);
  }

  private setSubpage = (subpage: AdminSubpage) => {
    this.setState({subpage});
  };
}

export default AdminPage;
