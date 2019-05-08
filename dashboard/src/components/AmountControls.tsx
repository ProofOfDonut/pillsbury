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
  amount: number;
  setAmount: (amount: number) => void;
  action: (amount: number) => void;
};
type State = {};
class AmountControls extends PureComponent<PropTypes, State> {
  render() {
    const classes = this.props.classes;
    return (
      <div className={classes.fieldContainer}>
        <div className={classes.fieldText}>
          <AmountField
              value={this.props.amount}
              setValue={this.props.setAmount} />
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

  private action = () => {
    this.props.action(this.props.amount);
  };
}

export default withStyles(styles, {withTheme: true})(AmountControls);
