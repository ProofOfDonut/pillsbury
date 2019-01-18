export function mapToObject<T>(map: Map<string, T>): Object {
  const output = Object.create(null);
  for (const [key, value] of map.entries()) {
    output[key] = value;
  }
  return output;
}
