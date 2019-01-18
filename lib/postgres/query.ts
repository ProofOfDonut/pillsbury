import {IDatabase, ITask} from 'pg-promise';

export function queryOn(
    target: IDatabase<void>|ITask<void>,
    strings: TemplateStringsArray,
    values: any[]):
    Promise<any> {
  let s = '';
  for (let i = 0; i < strings.length; i++) {
    if (i > 0) {
      s += '$' + i;
    }
    s += strings[i].replace(/\$/g, '\\$');
  }
  return target.query(s, values);
}
