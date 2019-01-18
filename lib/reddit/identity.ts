import {ensurePropType} from '../../common/ensure';
import {getWithToken} from './request';
  
export async function getUsername(
    token: string):
    Promise<string> {
  const response = await getWithToken(
      token,
      'https://oauth.reddit.com/api/v1/me');
  return <string> ensurePropType(response, 'name', 'string');
}
