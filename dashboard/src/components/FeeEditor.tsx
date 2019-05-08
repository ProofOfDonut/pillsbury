import Checkbox from '@material-ui/core/Checkbox';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import InputAdornment from '@material-ui/core/InputAdornment';
import TextField from '@material-ui/core/TextField';
import {Theme, withStyles} from '@material-ui/core/styles';
import React, {ChangeEvent, Fragment, PureComponent} from 'react';
import {Fee, FeeType} from '../common/types/Fee';

const styles = (theme: Theme) => ({
  valueField: {
    width: 160,
  },
});

type PropTypes = {
  classes: {
    valueField: string;
  };
  value: Fee;
  setValue: (fee: Fee) => void;
};
type State = {};
class FeeEditor extends PureComponent<PropTypes, State> {
  render() {
    const classes = this.props.classes;
    return (
      <Fragment>
        <FormControlLabel
            label="Static"
            control={
              <Checkbox
                  checked={this.props.value.type == FeeType.STATIC}
                  onChange={this.onTypeChange} />
            } />
        <TextField
            className={classes.valueField}
            label="Value"
            value={this.props.value.value || ''}
            onChange={this.onValueChange}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  {this.getValueUnit()}
                </InputAdornment>
              ),
            }} />
      </Fragment>
    );
  }

  private getValueUnit(): string {
    switch (this.props.value.type) {
      case FeeType.STATIC:
        return 'Donuts';
      case FeeType.RELATIVE:
        return 'Basis\u00a0Points';
    }
    throw new Error(`Unknown fee type (${this.props.value.type}).`);
  }

  private onValueChange = (
      event: ChangeEvent<
          HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) => {
    const value = event.target.value;
    if (/^\d*$/.test(value)) {
      this.props.setValue(
          new Fee(
              this.props.value.type,
              +value));
    }
  };

  private onTypeChange = (event: ChangeEvent<HTMLInputElement>) => {
    this.props.setValue(
        new Fee(
            event.target.checked ? FeeType.STATIC : FeeType.RELATIVE,
            this.props.value.value));
  };
}

export default withStyles(styles, {withTheme: true})(FeeEditor);
