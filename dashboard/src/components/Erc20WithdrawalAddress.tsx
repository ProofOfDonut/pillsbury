import TextField from '@material-ui/core/TextField';
import {Theme, withStyles} from '@material-ui/core/styles';
import React, {ChangeEvent, PureComponent} from 'react';

const styles = {};

type PropTypes = {
  classes: {};
  value: string;
  setValue: (value: string) => void;
};
type State = {};
class Erc20WithdrawalAddress extends PureComponent<PropTypes, State> {
  render() {
    const classes = this.props.classes;
    return (
      <TextField
          label="Address"
          value={this.props.value}
          onChange={this.onChange}
          fullWidth={true} />
    );
  }

  private onChange = (event: ChangeEvent<
        HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) => {
    this.props.setValue(event.target.value);
  }
}

export default withStyles(styles, {withTheme: true})(Erc20WithdrawalAddress);
