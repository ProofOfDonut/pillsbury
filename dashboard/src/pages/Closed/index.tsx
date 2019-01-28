import {Theme, withStyles} from '@material-ui/core/styles';
import React, {PureComponent} from 'react';
import Module from '../../components/Module';
import SadDogeImage from './sad_doge.jpg';

const styles = (theme: Theme) => ({
  module: {
    display: 'flex',
    position: 'relative' as 'relative',
    maxWidth: 525,
    margin: '40px auto',
    padding: theme.spacing.unit * 2,
    paddingTop: theme.spacing.unit * 4,
  },
  imageContainer: {
    width: 150,
    overflow: 'hidden',
  },
  image: {
    width: 250,
    marginLeft: -60,
  },
  content: {
    paddingLeft: 16,
  },
});

type PropTypes = {
  classes: {
    module: string;
    imageContainer: string;
    image: string;
    content: string;
  };
};
type State = {};
class ClosedPage extends PureComponent<PropTypes, State> {
  render() {
    const classes = this.props.classes;
    return (
      <Module className={classes.module}>
        <div>
          <div className={classes.imageContainer}>
            <img className={classes.image}
                 src={SadDogeImage} />
          </div>
        </div>
        <div className={classes.content}>
          The bridge is currently closed indefinitely. See
          {' '}
          <a href="https://www.reddit.com/r/donuttrader">/r/donuttrader</a>
          {' '}
          for more information and to be involved in ongoing discussions about
          potentially reopening the bridge.
        </div>
      </Module>
    );
  }
}

export default withStyles(styles, {withTheme: true})(ClosedPage);
