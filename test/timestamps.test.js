import setup, { teardown, model } from './utils/db';
import { wait } from 'promist';

test(`throws when there is no schema or no schema.properties`, async () => {
  const db = await setup();
  const data1 = model('items');
  const data2 = model('items');
  delete data1.schema;
  delete data2.schema.properties;

  await expect(db.collection(data1)).rejects.toThrowError();
  await expect(db.collection(data2)).rejects.toThrowError();
  await teardown(db);
});
test(`timestamps are not inserted when absent`, async () => {
  const db = await setup();
  await db.collection(model('items'));
  await db.collections.items.insert({});
  const item = await db.collections.items.findOne().exec();

  expect(item.createdAt).toBe(undefined);
  expect(item.updatedAt).toBe(undefined);
  await teardown(db);
});
test(`timestamps are inserted when flagged true on database only`, async () => {
  const db = await setup({ timestamps: true });
  await db.collection(model('items'));
  await db.collections.items.insert({});
  const item = await db.collections.items.findOne().exec();

  expect(item.createdAt).not.toBe(undefined);
  expect(item.updatedAt).not.toBe(undefined);
  await teardown(db);
});
test(`timestamps are inserted properly with database overrides only`, async () => {
  const db = await setup({
    timestamps: {
      createdAt: 'created_renamed',
      updatedAt: 'updated_renamed'
    }
  });
  await db.collection(model('items'));
  await db.collections.items.insert({});
  const item = await db.collections.items.findOne().exec();

  expect(item.createdAt).toBe(undefined);
  expect(item.updatedAt).toBe(undefined);
  expect(item.created_renamed).not.toBe(undefined);
  expect(item.updated_renamed).not.toBe(undefined);
  await teardown(db);
});
test(`timestamps are inserted when flagged true on collection only`, async () => {
  const db = await setup();
  await db.collection(model('items'));
  await db.collection({
    ...model('overrides'),
    options: { timestamps: true }
  });
  await db.collections.items.insert({});
  await db.collections.overrides.insert({});
  const item = await db.collections.items.findOne().exec();
  const override = await db.collections.overrides.findOne().exec();

  expect(item.createdAt).toBe(undefined);
  expect(item.updatedAt).toBe(undefined);
  expect(override.createdAt).not.toBe(undefined);
  expect(override.updatedAt).not.toBe(undefined);

  await teardown(db);
});
test(`timestamps are inserted with collection overrides only`, async () => {
  const db = await setup();
  await db.collection(model('items'));
  await db.collection({
    ...model('overrides'),
    options: {
      timestamps: {
        createdAt: 'created_renamed',
        updatedAt: 'updated_renamed'
      }
    }
  });
  await db.collections.items.insert({});
  await db.collections.overrides.insert({});
  const item = await db.collections.items.findOne().exec();
  const override = await db.collections.overrides.findOne().exec();

  expect(item.createdAt).toBe(undefined);
  expect(item.updatedAt).toBe(undefined);
  expect(item.created_renamed).toBe(undefined);
  expect(item.updated_renamed).toBe(undefined);
  expect(override.createdAt).toBe(undefined);
  expect(override.updatedAt).toBe(undefined);
  expect(override.created_renamed).not.toBe(undefined);
  expect(override.updated_renamed).not.toBe(undefined);
  await teardown(db);
});
test(`timestamps are inserted properly when collection overrides defaults`, async () => {
  const db = await setup({ timestamps: true });

  await db.collection(model('items'));
  await db.collection({
    ...model('overrides'),
    options: {
      timestamps: {
        createdAt: 'created_renamed',
        updatedAt: 'updated_renamed'
      }
    }
  });
  await db.collections.items.insert({});
  await db.collections.overrides.insert({});
  const item = await db.collections.items.findOne().exec();
  const override = await db.collections.overrides.findOne().exec();

  expect(item.createdAt).not.toBe(undefined);
  expect(item.updatedAt).not.toBe(undefined);
  expect(item.created_renamed).toBe(undefined);
  expect(item.updated_renamed).toBe(undefined);
  expect(override.createdAt).toBe(undefined);
  expect(override.updatedAt).toBe(undefined);
  expect(override.created_renamed).not.toBe(undefined);
  expect(override.updated_renamed).not.toBe(undefined);
});
test(`timestamps are not inserted when collection disables`, async () => {
  const db = await setup({ timestamps: true });

  await db.collection(model('items'));
  await db.collection({
    ...model('overrides'),
    options: { timestamps: false }
  });
  await db.collections.items.insert({});
  await db.collections.overrides.insert({});
  const item = await db.collections.items.findOne().exec();
  const override = await db.collections.overrides.findOne().exec();

  expect(item.createdAt).not.toBe(undefined);
  expect(item.updatedAt).not.toBe(undefined);
  expect(override.createdAt).toBe(undefined);
  expect(override.updatedAt).toBe(undefined);

  await teardown(db);
});
test(`timestamps on creation are correct`, async () => {
  const beforeDate = new Date();
  await wait(100);

  const db = await setup();
  await db.collection({
    ...model('items'),
    options: { timestamps: true }
  });
  await db.collections.items.insert({});
  const item = await db.collections.items.findOne().exec();

  await wait(100);
  const afterDate = new Date();

  expect(beforeDate < new Date(item.createdAt)).toBe(true);
  expect(afterDate > new Date(item.createdAt)).toBe(true);
  expect(beforeDate < new Date(item.updatedAt)).toBe(true);
  expect(afterDate > new Date(item.updatedAt)).toBe(true);
  await teardown(db);
});
test(`timestamps on update are correct`, async () => {
  const beforeDate = new Date();
  await wait(100);

  const db = await setup();
  await db.collection({
    ...model('items'),
    options: { timestamps: true }
  });
  await db.collections.items.insert({});
  const item = await db.collections.items.findOne().exec();

  await wait(100);
  const middleDate = new Date();
  await wait(100);

  await item.update({ $set: { name: 'myName' } });

  await wait(100);
  const afterDate = new Date();

  expect(beforeDate < new Date(item.createdAt)).toBe(true);
  expect(middleDate > new Date(item.createdAt)).toBe(true);
  expect(middleDate < new Date(item.updatedAt)).toBe(true);
  expect(afterDate > new Date(item.updatedAt)).toBe(true);
  await teardown(db);
});
test(`maintains createdAt if specified`, async () => {
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
