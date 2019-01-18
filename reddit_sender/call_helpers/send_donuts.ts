import {Method, request} from '../../common/net/request';

export async function sendRedditDonuts(
    host: string,
    port: number,
    recipient: string,
    amount: number) {
  await request(
      Method.POST,
      `http://${host}:${port}/send:${recipient}:${amount}`);
}
