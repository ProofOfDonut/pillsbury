import {Theme, withStyles} from '@material-ui/core/styles';
import React, {PureComponent, ReactNode} from 'react';
import OpenInNew from './OpenInNew';

const styles = (theme: Theme) => ({});

type PropTypes = {
  classes: {};
  href: string;
  children: ReactNode;
};
type State = {};
class ExternalLink extends PureComponent<PropTypes, State> {
  render() {
    const classes = this.props.classes;
    return (
      <a href={this.props.href}
         target="_blank">
        {this.props.children}<OpenInNew />
      </a>
    );
  }
}

export default withStyles(styles, {withTheme: true})(ExternalLink);
