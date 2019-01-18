import Button from '@material-ui/core/Button';
import {Theme, withStyles} from '@material-ui/core/styles';
import React, {PureComponent} from 'react';
import AmountField from './AmountField';

const styles = (theme: Theme) => ({
  fieldContainer: {
    display: 'flex',
  },
  fieldText: {
    flex: '1',
  },
  fieldButton: {
    alignSelf: 'center',
  },
});

type PropTypes = {
  classes: {
    fieldContainer: string;
    fieldText: string;
    fieldButton: string;
  };
  label: string;
  action: (amount: number) => void;
};
type State = {
  amount: number;
};
class AmountControls extends PureComponent<PropTypes, State> {
  state = {
    amount: 0,
  };

  render() {
    const classes = this.props.classes;
    return (
      <div className={classes.fieldContainer}>
        <div className={classes.fieldText}>
          <AmountField
              value={this.state.amount}
              setValue={this.setAmount} />
        </div>
        <div className={classes.fieldButton}>
          <Button variant="contained"
                  color="primary"
                  onClick={this.action}>
            {this.props.label}
          </Button>
        </div>
      </div>
    );
  }

  private setAmount = (amount: number) => {
    this.setState({amount});
  };

  private action = () => {
    this.props.action(this.state.amount);
  };
}

export default withStyles(styles, {withTheme: true})(AmountControls);
