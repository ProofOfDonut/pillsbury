import React, {PureComponent} from 'react';
import {Link, Route} from 'react-router-dom';
import ListItem, {ListItemProps} from '@material-ui/core/ListItem';

const LinkListItem = (props: any) => <ListItem {...props} />;

type PropTypes = {
  to: string;
};
type State = {};

export class RouteListItem extends PureComponent<PropTypes, State> {
  render() {
    return (
      <Route exact path={this.props.to} children={({match}) => (
        <LinkListItem
            button
            component={Link}
            to={this.props.to}
            selected={!!match}>
          {this.props.children}
        </LinkListItem>
      )} />
    );
  }
}
