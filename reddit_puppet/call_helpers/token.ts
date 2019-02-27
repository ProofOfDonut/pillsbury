import {ensure} from '../../common/ensure';
import {Method, request} from '../../common/net/request';
import {GlazeDbClient} from '../../glaze_db';

export async function withToken<T>(
    glazeDb: GlazeDbClient,
    puppetHost: string,
    puppetPort: number,
    callback: (token: string) => Promise<T>) {
  let token = await glazeDb.getRedditHubBearerToken();
  let fetchedNewToken = false;
  if (!token) {
    token = await fetchNewToken(glazeDb, puppetHost, puppetPort);
    fetchedNewToken = true;
  }
  try {
    // `await` is required so that the `try`/`catch` works.
    return await callback(token);
  } catch (err) {
    // If we didn't just update the token, try again with a new token because
    // the old one may have expired.
    if (!fetchedNewToken) {
      token = await fetchNewToken(glazeDb, puppetHost, puppetPort);
      return callback(token);
    } else {
      throw err;
    }
  }
}

async function fetchNewToken(
    glazeDb: GlazeDbClient,
    host: string,
    port: number):
    Promise<string> {
  await request(
      Method.POST,
      `http://${host}:${port}/update-reddit-hub-bearer-token`);
  return ensure(await glazeDb.getRedditHubBearerToken());
}
