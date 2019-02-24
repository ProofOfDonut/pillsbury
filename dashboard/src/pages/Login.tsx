import React, {PureComponent} from 'react';
import {HttpMethod} from '../common/net/http_method';
import {RequestParams} from '../common/net/request_params';
import Introduction from '../components/Introduction';

type PropTypes = {
  csrfToken: string;
  redditClientId: string;
  redditRedirectUri: string;
};
type State = {};
class LoginPage extends PureComponent<PropTypes, State> {
  render() {
    return (
      <Introduction
          loginUrl={this.getLoginUrl()} />
    );
  }

  private getLoginUrl(): string {
    return this.urlFrom(
        'https://www.reddit.com/api/v1/authorize',
        new RequestParams([
          ['client_id', this.props.redditClientId],
          ['response_type', 'code'],
          ['state', this.props.csrfToken],
          ['redirect_uri', this.props.redditRedirectUri],
          ['duration', 'permanent'],
          ['scope', 'identity'],
        ]));
  }

  private urlFrom(url: string, queryParams: RequestParams): string {
    return url + queryParams.toString(HttpMethod.GET);
  }
}

export default LoginPage;
