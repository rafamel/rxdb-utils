import { isOnable } from '../src/onable';
import { currentSymbol } from '../src/symbols';

describe(`- isOnable`, () => {
  test(`Works`, () => {
    expect(isOnable()).toBe(false);
    expect(isOnable({})).toBe(false);
    expect(isOnable({ [currentSymbol]: true })).toBe(true);
  });
});
