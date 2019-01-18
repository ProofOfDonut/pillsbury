import {ensurePropString} from '../ensure';

export class User {
  id: string;
  username: string;

  static fromJSON(json: Object) {
    return new User(
        ensurePropString(json, 'id'),
        ensurePropString(json, 'username'));
  }

  constructor(id: string, username: string) {
    this.id = id;
    this.username = username;
  }

  toJSON() {
    return {
      'id': this.id,
      'username': this.username,
    };
  }
}
