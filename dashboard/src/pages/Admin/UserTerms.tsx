import {Map} from 'immutable';
import Fab from '@material-ui/core/Fab';
import {Theme, withStyles} from '@material-ui/core/styles';
import AddIcon from '@material-ui/icons/Add';
import React, {Fragment, PureComponent} from 'react';
import {ensure} from '../../common/ensure';
import {UserTerm} from '../../common/types/UserTerm';
import UserTermEditor from '../../components/UserTermEditor';

const styles = (theme: Theme) => ({
  fab: {
    position: 'fixed' as 'fixed',
    bottom: theme.spacing.unit * 2,
    right: theme.spacing.unit * 2,
  },
});

type PropTypes = {
  classes: {
    fab: string;
  };
  getAllUserTerms: () => UserTerm[];
  setUserTerms: (userTerms: UserTerm[]) => Promise<void>;
};
type State = {
  editable: Map<number, boolean>;
  newTerm: UserTerm|null;
};
class AdminUserTermsPage extends PureComponent<PropTypes, State> {
  state = {
    editable: Map<number, boolean>(),
    newTerm: null,
  };

  render() {
    const classes = this.props.classes;
    return (
      <Fragment>
        {this.renderUserTerms()}
        <Fab className={classes.fab}
             color="primary"
             onClick={this.addUserTerm}
             disabled={this.state.newTerm != null}>
          <AddIcon />
        </Fab>
      </Fragment>
    );
  }

  private renderUserTerms() {
    const out = [];
    for (const term of this.getAllUserTerms()) {
      out.push(
        <UserTermEditor
            key={term.id}
            value={term}
            setValue={this.setUserTerm}
            delete={() => this.deleteUserTerm(term.id)}
            editable={!!this.state.editable.get(term.id)}
            setEditable={(editable: boolean) =>
                this.setEditable(term.id, editable)} />
      );
    }
    return out;
  }

  private getAllUserTerms(): UserTerm[] {
    let terms = this.props.getAllUserTerms();
    const newTerm = this.state.newTerm;
    if (newTerm) {
      terms = [...terms, newTerm];
    }
    return terms;
  }

  private addUserTerm = () => {
    ensure(this.state.newTerm == null);
    this.setState({
      newTerm: new UserTerm(
          0, // A 0 ID indicates that the term hasn't been saved to the DB.
          '',
          '',
          'I accept'),
      editable: this.state.editable.set(0, true),
    });
  };

  private setUserTerm = (term: UserTerm): Promise<void> => {
    return this.props.setUserTerms(this.getAllUserTerms().map(u => {
      if (u.id == term.id) {
        return term;
      }
      return u;
    }))
  };

  private deleteUserTerm = (termId: number) => {
    if (termId == 0) {
      this.setState({newTerm: null});
      return;
    }
    this.props.setUserTerms(
        this.props.getAllUserTerms().filter(u => u.id != termId));
  };

  private setEditable(termId: number, editable: boolean): Promise<void> {
    const newTerm = termId == 0 ? null : this.state.newTerm;
    return new Promise(resolve => this.setState({
      newTerm,
      editable: this.state.editable.set(termId, editable),
    }, resolve));
  }
}

export default withStyles(styles, {withTheme: true})(AdminUserTermsPage);
