import Button from '@material-ui/core/Button';
import Checkbox from '@material-ui/core/Checkbox';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import IconButton from '@material-ui/core/IconButton';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import {Theme, withStyles} from '@material-ui/core/styles';
import DeleteIcon from '@material-ui/icons/Delete';
import EditIcon from '@material-ui/icons/Edit';
import React, {ChangeEvent, Fragment, PureComponent} from 'react';
import {UserTerm} from '../common/types/UserTerm';
import Module, {ModuleStatus} from '../components/Module';

const styles = (theme: Theme) => ({
  root: {
    position: 'relative' as 'relative',
    maxWidth: 700,
  },
  toolbar: {
    position: 'absolute' as 'absolute',
    top: theme.spacing.unit,
    right: theme.spacing.unit,
  },
  text: {
    margin: '16px 0',
    whiteSpace: 'pre-line' as 'pre-line',
  },
  field: {
    margin: '16px 0',
  },
  actionButtons: {
    textAlign: 'right' as 'right',
  },
});

type PropTypes = {
  classes: {
    root: string;
    toolbar: string;
    text: string;
    field: string;
    actionButtons: string;
  };
  value: UserTerm;
  setValue: (term: UserTerm) => Promise<void>;
  delete: () => void;
  editable: boolean;
  setEditable: (editable: boolean) => Promise<void>;
};
type State = {
  saving: boolean;
  title: string;
  text: string;
  acceptLabel: string;
};
class UserTermEditor extends PureComponent<PropTypes, State> {
  constructor(props: PropTypes) {
    super(props);
    this.state = {
      saving: false,
      title: props.value.title,
      text: props.value.text,
      acceptLabel: props.value.acceptLabel,
    };
  }

  render() {
    const classes = this.props.classes;
    return (
      <Module className={classes.root}
              status={this.getStatus()}>
        <div className={classes.toolbar}>
          <IconButton onClick={this.edit}
                      disabled={this.props.editable}>
            <EditIcon />
          </IconButton>
          <IconButton onClick={this.delete}>
            <DeleteIcon />
          </IconButton>
        </div>
        {this.props.editable ? this.renderEditable() : this.renderStatic()}
      </Module>
    );
  }

  private getStatus(): ModuleStatus|null {
    if (this.state.saving) {
      return new ModuleStatus(true, 'Saving');
    }
    return null;
  }

  private renderStatic() {
    const classes = this.props.classes;
    const term = this.props.value;
    return (
      <Fragment>
        <Typography variant="h6">
          {term.title}
        </Typography>
        <div className={classes.text}>
          {term.text}
        </div>
        <FormControlLabel
            label={term.acceptLabel}
            control={<Checkbox checked={false} />} />
      </Fragment>
    );
  }

  private renderEditable() {
    const classes = this.props.classes;
    const term = this.state;
    return (
      <Fragment>
        <TextField
            className={classes.field}
            label="Title"
            value={term.title}
            onChange={this.onTitleChange}
            fullWidth />
        <TextField
            className={classes.field}
            variant="outlined"
            label="Text"
            value={term.text}
            onChange={this.onTextChange}
            fullWidth
            multiline />
        <TextField
            className={classes.field}
            label="Accept Label"
            value={term.acceptLabel}
            onChange={this.onAcceptLabelChange}
            fullWidth />
        <div className={classes.actionButtons}>
          <Button color="primary"
                  onClick={this.save}>
            Save
          </Button>
          <Button onClick={this.cancelEdit}>
            Cancel
          </Button>
        </div>
      </Fragment>
    );
  }

  private edit = async () => {
    const term = this.props.value;
    await new Promise(resolve => this.setState({
      title: term.title,
      text: term.text,
      acceptLabel: term.acceptLabel,
    }, resolve));
    this.props.setEditable(true);
  };

  private cancelEdit = () => {
    this.props.setEditable(false);
  };

  private delete = () => {
    const response = confirm('Are you sure you want to delete this?');
    if (response) {
      this.props.delete();
    }
  };

  private onTitleChange = (
      event: ChangeEvent<
          HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) => {
    const value = event.target.value;
    this.setState({title: value});
  };

  private onTextChange = (
      event: ChangeEvent<
          HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) => {
    const value = event.target.value;
    this.setState({text: value});
  };

  private onAcceptLabelChange = (
      event: ChangeEvent<
          HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) => {
    const value = event.target.value;
    this.setState({acceptLabel: value});
  };

  private save = async () => {
    await this.setState({saving: true});
    await this.props.setValue(
        new UserTerm(
            this.props.value.id,
            this.state.title,
            this.state.text,
            this.state.acceptLabel));
    await this.props.setEditable(false);
    this.setState({
      saving: false,
    });
  };
}

export default withStyles(styles, {withTheme: true})(UserTermEditor);
