import {Theme, withStyles} from '@material-ui/core/styles';
import React, {PureComponent} from 'react';
import OpenInNewIcon from '@material-ui/icons/OpenInNew';

const styles = (theme: Theme) => ({
  root: {
    width: 12,
    height: 12,
    fill: 'rgb(0, 0, 238)',
    verticalAlign: 'top',
  }
});

type PropTypes = {
  classes: {
    root: string;
  };
};
type State = {};
class OpenInNew extends PureComponent<PropTypes, State> {
  render() {
    const classes = this.props.classes;
    return <OpenInNewIcon className={classes.root} />;
  }
}

export default withStyles(styles, {withTheme: true})(OpenInNew);
