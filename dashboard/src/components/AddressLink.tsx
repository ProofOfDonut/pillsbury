import {Theme, withStyles} from '@material-ui/core/styles';
import React, {PureComponent, ReactNode} from 'react';
import ExternalLink from './ExternalLink';

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
  address: string;
  type?: string;
  abbreviate?: boolean;
  children?: ReactNode;
};
type State = {};
class AddressLink extends PureComponent<PropTypes, State> {
  static defaultProps = {
    type: 'address',
  };

  render() {
    return (
      <ExternalLink href={this.getHref()}>
        {this.props.children || this.getAddressForDisplay()}
      </ExternalLink>
    );
  }

  private getHref(): string {
    return `https://etherscan.io/${this.getEndpoint()}/${this.props.address}`;
  }

  private getEndpoint(): string {
    switch (this.props.type) {
      case 'transaction':
        return 'tx';
      case 'address':
        return 'address';
    }
    throw new Error(`Unknown type "${this.props.type}".`);
  }

  private getAddressForDisplay(): string {
    if (this.props.abbreviate) {
      const start = this.props.address.slice(0, 8);
      const end = this.props.address.slice(-6);
      return start + '\u2026' + end;
    }
    return this.props.address;
  }
}

export default withStyles(styles, {withTheme: true})(AddressLink);
