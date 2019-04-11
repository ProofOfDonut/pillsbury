export function ensure(test: any, message: string = 'Validation failed.'): any {
  if (!test) {
    throw new Error(message);
  }
  return test;
}

export function ensureEqual(
    a: any,
    b: any,
    message: string = `Expected (${a}) to equal (${b}).`):
    any {
  ensure(a === b, message);
  return a;
}

export function ensureNotEqual(
    a: any,
    b: any,
    message: string = `Expected (${a}) to not equal (${b}).`):
    any {
  ensure(a !== b, message);
  return a;
}

export function ensureType(
    value: any,
    type: string,
    message: string = `Expected type "${type}" but found "${typeof value}".`):
    any {
  ensure(typeof value == type, message);
  if (type == 'object') {
    ensure(value != null, message);
  }
  return value;
}

export function ensureNumber(
    value: any,
    message: string = ''):
    number {
  return <number> ensureType(value, 'number', message || undefined);
}

export function ensureString(
    value: any,
    message: string = ''):
    string {
  return <string> ensureType(value, 'string', message || undefined);
}

export function ensureObject(
    value: any,
    message: string = ''):
    Object {
  return <Object> ensureType(value, 'object', message || undefined);
}

export function ensureArray(
    value: any,
    message: string =
        `Expected value to be an array but found type "${typeof value}".`):
    any[] {
  ensure(Array.isArray(value), message);
  return <any[]> value;
}

export function ensureDate(
    value: any,
    message: string =
        `Expected value to be a date but found type "${typeof value}".`):
    Date {
  ensure(value instanceof Date, message);
  return <Date> value;
}

export function ensurePropEquals(
    obj: Object,
    key: string,
    expected: any,
    message: string = ''):
    any {
  const actual = (<any> obj)[key];
  if (!message) {
    message =
        `Expected property "${key}" to equal (${expected}) `
        + `but found (${actual}).`;
  }
  return ensureEqual(actual, expected, message);
}

export function ensureProp(
    obj: Object,
    key: string,
    message: string = ''):
    any {
  const actual = (<any> obj)[key];
  if (!message) {
    message = `Expected property "${key}" could not be found.`;
  }
  ensure(typeof actual != 'undefined', message);
  return actual;
}

export function ensurePropType(
    obj: Object,
    key: string,
    type: any,
    message: string = ''):
    any {
  const actual = ensureProp(obj, key);
  if (!message) {
    message =
        `Expected property "${key}" type to equal "${type}" `
        + `but found "${typeof actual}".`;
  }
  return ensureType(actual, type, message);
}

export function ensurePropBoolean(
    obj: Object,
    key: string,
    message: string = ''):
    boolean {
  return <boolean> ensurePropType(obj, key, 'boolean', message);
}

export function ensurePropNumber(
    obj: Object,
    key: string,
    message: string = ''):
    number {
  return <number> ensurePropType(obj, key, 'number', message);
}

export function ensurePropSafeInteger(
    obj: Object,
    key: string,
    message: string = ''):
    number {
  return ensureSafeInteger(
      <number> ensurePropType(obj, key, 'number', message),
      message || undefined);
}

export function ensurePropBigNumber(
    obj: Object,
    key: string,
    message: string = ''):
    // TODO: What is the correct return type?
    any {
  const value = ensurePropType(obj, key, 'object', message);
  // TODO: How can we check to make sure the value is a actually a `BigNumber`
  // beyond just making sure it's an object?
  return value;
}

export function ensurePropString(
    obj: Object,
    key: string,
    message: string = ''):
    string {
  return <string> ensurePropType(obj, key, 'string', message);
}

export function ensurePropObject(
    obj: Object,
    key: string,
    message: string = ''):
    Object {
  return <Object> ensurePropType(obj, key, 'object', message);
}

export function ensurePropArray(
    obj: Object,
    key: string,
    message: string = ''):
    any[] {
  const actual = ensureProp(obj, key);
  if (!message) {
    message =
        `Expected property "${key}" to be an array `
        + `but found type "${typeof actual}".`;
  }
  return ensureArray(actual, message);
}

export function ensurePropArrayOfType(
    obj: Object,
    key: string,
    type: string,
    message: string = ''):
    any[] {
  const values = ensurePropArray(obj, key, message);
  for (const value of values) {
    if (!message) {
      message = `Expected property "${key}" to be an array of type "${type}" `
          + `but found an array of type "${typeof value}".`;
    }
    ensureType(value, type, message);
  }
  return values;
}

export function ensurePropDate(
    obj: Object,
    key: string,
    message: string = ''):
    Date {
  const actual = ensureProp(obj, key);
  if (!message) {
    message =
        `Expected property "${key}" to be a date `
        + `but found type "${typeof actual}".`;
  }
  return ensureDate(actual, message);
}

export function ensurePropInEnum<T>(
    obj: Object,
    key: string,
    values: any,
    message: string = ''):
    T {
  return ensureInEnum<T>(
      values,
      ensureProp(obj, key, message),
      message || undefined);
}

export function ensureSafeInteger(
    value: any,
    message: string = `Expected a safe integer (${value}).`):
    number {
  ensure(Number.isSafeInteger(value), message);
  return <number> value;
}

export function ensureSafePositiveInteger(
    value: any,
    message: string = `Expected a safe positive integer (${value}).`):
    number {
  ensureSafeInteger(value, message);
  ensure(value > 0, message);
  return value;
}

export function ensureInEnum<T>(
    values: any,
    value: any,
    message: string = `Expected value (${value}) to be included in enum.`): T {
  ensure(Object.values(values).includes(value), message);
  return <T> value;
}

export function ensureHexString(
    s: string,
    minLength: number,
    maxLength: number = minLength,
    message: string = `Invalid hex string "${s}"`):
    string {
  ensure(/^0x[A-Fa-f0-9]+$/.test(s), message);
  ensure(s.length >= minLength + 2 && s.length <= maxLength + 2,
      `Expected hex string length in [${minLength}, ${maxLength}] "${s}"`);
  return s;
}

export function ensurePropHexString(
    obj: Object,
    key: string,
    minLength: number,
    maxLength: number = minLength,
    message: string = ''):
    string {
  const s = ensurePropString(obj, key, message || undefined);
  return ensureHexString(s, minLength, maxLength, message || undefined);
}
