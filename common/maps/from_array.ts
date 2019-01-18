import {Map} from 'immutable';
import {ensureEqual} from '../ensure';

export function arrayToMap<K, V>(
    entries: any[][],
    convertKey: (k: any) => K,
    convertValue: (v: any) => V):
    Map<K, V> {
  const newEntries: [K, V][] = [];
  for (const entry of entries) {
    newEntries.push(getPair(entry, convertKey, convertValue));
  }
  return Map(newEntries);
}

function getPair<K, V>(
    entry: Array<any>,
    convertKey: (k: any) => K,
    convertValue: (v: any) => V):
    [K, V] {
  ensureEqual(entry.length, 2);
  const k = convertKey(entry[0]);
  const v = convertValue(entry[1]);
  return [k, v];
}
