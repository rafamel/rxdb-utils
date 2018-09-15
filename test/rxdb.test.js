import * as RxDB from 'rxdb';

describe(`- Basic`, () => {
  test(`Exports PouchDB`, () => {
    expect(typeof RxDB.PouchDB).toBe('function');
  });
});
