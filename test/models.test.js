import setup, { teardown, model } from './utils/db';

test(`db.models exists`, async () => {
  const db = await setup();
  expect(db.models).not.toBe(undefined);
  await teardown(db);
});
test(`returns db when empty`, async () => {
  const db = await setup();
  const isDb1 = await db.models();
  const isDb2 = await db.models([]);

  expect(isDb1).toBe(db);
  expect(isDb2).toBe(db);
  await teardown(db);
});
test(`collection is created and returns db`, async () => {
  const db = await setup();
  const isDb = await db.models(model('items'));

  expect(isDb).toBe(db);
  expect(db.collections.random).toBe(undefined);
  expect(db.collections.items).not.toBe(undefined);
  await teardown(db);
});
test(`collections are created w/ an array and returns db`, async () => {
  const db = await setup();
  const isDb = await db.models([model('items'), model('elements')]);

  expect(isDb).toBe(db);
  expect(db.collections.random).toBe(undefined);
  expect(db.collections.items).not.toBe(undefined);
  expect(db.collections.elements).not.toBe(undefined);
  await teardown(db);
});
