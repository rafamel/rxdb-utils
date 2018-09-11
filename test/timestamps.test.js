import setup, { teardown, model } from './utils/db';

test(`timestamps are not inserted when absent`, async () => {
  expect.assertions(2);

  const db = await setup();
  await db.collection(model('items'));
  await db.collections.items.insert({});
  const item = await db.collections.items.findOne().exec();

  expect(item.createdAt).toBe(undefined);
  expect(item.updatedAt).toBe(undefined);
  await teardown(db);
});

test(`timestamps are inserted`, async () => {
  expect.assertions(2);

  const db = await setup();
  await db.collection({
    ...model('items'),
    options: { timestamps: true }
  });
  await db.collections.items.insert({});
  const item = await db.collections.items.findOne().exec();

  expect(item.createdAt).not.toBe(undefined);
  expect(item.updatedAt).not.toBe(undefined);
  await teardown(db);
});

test(`timestamps on creation are correct`, async () => {
  expect.assertions(4);

  const beforeDate = new Date();
  await new Promise((resolve) => setTimeout(resolve, 100));

  const db = await setup();
  await db.collection({
    ...model('items'),
    options: { timestamps: true }
  });
  await db.collections.items.insert({});
  const item = await db.collections.items.findOne().exec();

  await new Promise((resolve) => setTimeout(resolve, 100));
  const afterDate = new Date();

  expect(beforeDate < new Date(item.createdAt)).toBe(true);
  expect(afterDate > new Date(item.createdAt)).toBe(true);
  expect(beforeDate < new Date(item.updatedAt)).toBe(true);
  expect(afterDate > new Date(item.updatedAt)).toBe(true);
  await teardown(db);
});

test(`timestamps on update are correct`, async () => {
  expect.assertions(4);

  const beforeDate = new Date();
  await new Promise((resolve) => setTimeout(resolve, 100));

  const db = await setup();
  await db.collection({
    ...model('items'),
    options: { timestamps: true }
  });
  await db.collections.items.insert({});
  const item = await db.collections.items.findOne().exec();

  await new Promise((resolve) => setTimeout(resolve, 100));
  const middleDate = new Date();
  await new Promise((resolve) => setTimeout(resolve, 100));

  await item.update({ $set: { name: 'myName' } });

  await new Promise((resolve) => setTimeout(resolve, 100));
  const afterDate = new Date();

  expect(beforeDate < new Date(item.createdAt)).toBe(true);
  expect(middleDate > new Date(item.createdAt)).toBe(true);
  expect(middleDate < new Date(item.updatedAt)).toBe(true);
  expect(afterDate > new Date(item.updatedAt)).toBe(true);
  await teardown(db);
});

test(`maintains createdAt if specified`, async () => {
  expect.assertions(2);

  const date = new Date().toISOString();

  const db = await setup();
  await db.collection({
    ...model('items'),
    options: { timestamps: true }
  });
  await db.collections.items.insert({ createdAt: date });
  const item = await db.collections.items.findOne().exec();

  expect(item.createdAt).toBe(date);
  expect(item.updatedAt).not.toBe(date);
  await teardown(db);
});

test(`maintains updatedAt if specified`, async () => {
  expect.assertions(2);

  const date = new Date().toISOString();

  const db = await setup();
  await db.collection({
    ...model('items'),
    options: { timestamps: true }
  });
  await db.collections.items.insert({ updatedAt: date });
  const item = await db.collections.items.findOne().exec();

  expect(item.updatedAt).toBe(date);
  expect(item.createdAt).not.toBe(date);
  await teardown(db);
});
