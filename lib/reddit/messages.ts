import {
  ensurePropArray, ensurePropEquals, ensurePropType, ensureType,
} from '../../common/ensure';
import {RequestParams} from '../../common/net/request_params';
import {getWithToken, postWithToken} from './request';
import {Message} from './message';

export async function getMessages(
    token: string,
    sinceMessage: string = ''):
    Promise<Array<Message>> {
  const params = new RequestParams([
    ['limit', '100'],
  ]);
  if (sinceMessage) {
    params.add('before', `t4_${sinceMessage}`);
  }
  const response = await getWithToken(
      token,
      `https://oauth.reddit.com/message/inbox`,
      params);
  ensurePropEquals(response, 'kind', 'Listing');
  const data = ensurePropType(response, 'data', 'object');
  const children = ensurePropArray(data, 'children');
  const messages: Array<Message> = [];
  for (const child of children) {
    const c = <Object> ensureType(child, 'object');
    messages.push(new Message(c));
  }
  return messages;
}

export async function markMessagesRead(
    token: string,
    ids: string[]):
    Promise<void> {
  if (ids.length > 0) {
    await postWithToken(
        token,
        'https://oauth.reddit.com/api/read_message',
        new RequestParams([
          ['id', 't4_' + ids.join(',t4_')],
        ]));
  }
}

export async function sendMessage(
    token: string,
    to: string,
    subject: string,
    body: string):
    Promise<void> {
  await postWithToken(
      token,
      'https://oauth.reddit.com/api/compose',
      new RequestParams([
        ['api_type', 'json'],
        ['subject', subject],
        ['text', body],
        ['to', to],
      ]));
}
