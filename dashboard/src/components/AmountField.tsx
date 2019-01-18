import TextField from '@material-ui/core/TextField';
import React, {ChangeEvent, PureComponent} from 'react';

type PropTypes = {
  value: number;
  setValue: (value: number) => void;
};
type State = {};
class AmountField extends PureComponent<PropTypes, State> {
  render() {
    return (
      <TextField
          label="Amount"
          value={this.props.value == 0 ? '' : this.props.value}
          onChange={this.onChange}
          fullWidth={true} />
    );
  }

  private onChange = (
      event: ChangeEvent<
          HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) => {
    const value = event.target.value;
    if (/^\d*$/.test(value)) {
      this.props.setValue(+value);
    }
  };
}

export default AmountField;
