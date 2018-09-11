import setup, { teardown, model } from './utils/db';

test(`preInsert runs`, async () => {
  expect.assertions(1);

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

test(`preInsert receives data and collection`, async () => {
  expect.assertions(4);

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
  expect.assertions(7);

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
