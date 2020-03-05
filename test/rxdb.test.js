import * as RxDB from 'rxdb';

test(`exports PouchDB`, () => {
  expect(typeof RxDB.PouchDB).toBe('function');
});
