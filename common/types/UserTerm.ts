import {ensurePropSafeInteger, ensurePropString} from '../ensure';

export class UserTerm {
  id: number;
  title: string;
  text: string;
  acceptLabel: string;

  static fromJSON(json: Object): UserTerm {
    return new UserTerm(
        ensurePropSafeInteger(json, 'id'),
        ensurePropString(json, 'title'),
        ensurePropString(json, 'text'),
        ensurePropString(json, 'accept_label'));
  }

  constructor(id: number, title: string, text: string, acceptLabel: string) {
    this.id = id;
    this.title = title;
    this.text = text;
    this.acceptLabel = acceptLabel;
  }

  toJSON() {
    return {
      'id': this.id,
      'title': this.title,
      'text': this.text,
      'accept_label': this.acceptLabel,
    };
  }
}
