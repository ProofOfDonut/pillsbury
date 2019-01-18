import React, {PureComponent} from 'react';
import {HttpMethod} from '../common/net/http_method';
import {RequestParams} from '../common/net/request_params';
import Introduction from '../components/Introduction';

// TODO: Generalize to make development easier, so that different Client IDs
// (with different redirect URLs) can be used depending on if this is a
// development environment (maybe a quick way to do this would be to simply use
// the global Node-style variable that allows detecting if the build is a
// development build).
const CLIENT_ID =
    process.env.NODE_ENV == 'production'
        ? 'M5xhboQ9YZbKvQ'
        : 'hYxM2mpYIYFrHw';
const REDIRECT_URL =
    process.env.NODE_ENV == 'production'
        ? 'https://api.donut.dance/reddit/login'
        : 'http://192.168.56.102:3001/reddit/login';

type PropTypes = {
  csrfToken: string;
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
          ['client_id', CLIENT_ID],
          ['response_type', 'code'],
          ['state', this.props.csrfToken],
          ['redirect_uri',REDIRECT_URL],
          ['duration', 'permanent'],
          ['scope', 'identity'],
        ]));
  }

  private urlFrom(url: string, queryParams: RequestParams): string {
    return url + queryParams.toString(HttpMethod.GET);
  }
}

export default LoginPage;
