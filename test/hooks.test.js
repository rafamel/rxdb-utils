import setup, { teardown, model } from './utils/db';

test(`preInsert runs`, async () => {
  let run;
  const db = await setup();
  await db.collection({
    ...model('items'),
    options: {
      hooks: {
        preInsert: (data) => (run = true)
      }
    }
  });
  await db.collections.items.insert({});

  expect(run).toBe(true);
  await teardown(db);
});
test(`preInsert runs for inMemory`, async () => {
  let run;
  const db = await setup();
  const collection = await db.collection({
    ...model('items'),
    options: {
      hooks: {
        preInsert: (data) => (run = true)
      }
    }
  });
  const inMemCollection = await collection.inMemory();
  await inMemCollection.insert({});

  expect(run).toBe(true);
  await teardown(db);
});
test(`preInsert receives data and collection`, async () => {
  let rData, rCollection;
  const db = await setup();
  await db.collection({
    ...model('items'),
    options: {
      hooks: {
        preInsert: (data, collection) => {
          rData = data;
          rCollection = collection;
        }
      }
    }
  });
  await db.collections.items.insert({ name: 'some' });

  expect(rData).not.toBe(undefined);
  expect(rCollection).not.toBe(undefined);
  expect(rData.name).toBe('some');
  expect(rCollection.insert).not.toBe(undefined);
  await teardown(db);
});
test(`all run`, async () => {
  let preInsert,
    postInsert,
    preSave,
    postSave,
    preRemove,
    postRemove,
    postCreate;

  const db = await setup();
  await db.collection({
    ...model('items'),
    options: {
      hooks: {
        preInsert: () => (preInsert = true),
        postInsert: () => (postInsert = true),
        preSave: () => (preSave = true),
        postSave: () => (postSave = true),
        preRemove: () => (preRemove = true),
        postRemove: () => (postRemove = true),
        postCreate: () => (postCreate = true)
      }
    }
  });

  await db.collections.items.insert({ name: 'some' });
  expect(preInsert).toBe(true);
  expect(postInsert).toBe(true);
  expect(postCreate).toBe(true);

  const item = await db.collections.items.findOne().exec();
  await item.update({ $set: { name: 'other' } });
  expect(preSave).toBe(true);
  expect(postSave).toBe(true);

  await item.remove();
  expect(preRemove).toBe(true);
  expect(postRemove).toBe(true);
  await teardown(db);
});
test(`all are this bind to collection`, async () => {
  let preInsert,
    postInsert,
    preSave,
    postSave,
    preRemove,
    postRemove,
    postCreate;

  const db = await setup();
  await db.collection({
    ...model('items'),
    options: {
      hooks: {
        preInsert() {
          preInsert = this;
        },
        postInsert() {
          postInsert = this;
        },
        preSave() {
          preSave = this;
        },
        postSave() {
          postSave = this;
        },
        preRemove() {
          preRemove = this;
        },
        postRemove() {
          postRemove = this;
        },
        postCreate() {
          postCreate = this;
        }
      }
    }
  });

  await db.collections.items.insert({ name: 'some' });
  expect(preInsert).toHaveProperty('insert');
  expect(postInsert).toHaveProperty('insert');
  expect(postCreate).toHaveProperty('insert');

  const item = await db.collections.items.findOne().exec();
  await item.update({ $set: { name: 'other' } });
  expect(preSave).toHaveProperty('insert');
  expect(postSave).toHaveProperty('insert');

  await item.remove();
  expect(preRemove).toHaveProperty('insert');
  expect(postRemove).toHaveProperty('insert');
  await teardown(db);
});
test(`postInsert is bind to inMemory collection`, async () => {
  let postInsert;
  const db = await setup();
  const collection = await db.collection({
    ...model('items'),
    options: {
      hooks: {
        postInsert() {
          postInsert = this;
        }
      }
    }
  });

  const inMemCollection = await collection.inMemory();
  await inMemCollection.insert({ name: 'some' });
  expect(typeof postInsert.insert).toBe('function');

  await teardown(db);
});
