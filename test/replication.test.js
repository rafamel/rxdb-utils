import setup, { pouchSetup, teardown, model } from './utils/db';

describe(`- Basic setup`, () => {
  test(`adds rx_model`, async () => {
    expect.assertions(1);

    const db = await setup();
    await db.collection(model('items'));
    await db.collections.items.insert({});
    const item = await db.collections.items.findOne().exec();

    expect(item.rx_model).toBe('items');
    await teardown(db);
  });

  test(`db.replicate() exists`, async () => {
    expect.assertions(1);

    const db = await setup();

    expect(typeof db.replicate).toBe('function');
    await teardown(db);
  });

  test(`db.replications exists`, async () => {
    expect.assertions(1);

    const db = await setup();

    expect(Array.isArray(db.replications)).toBe(true);
    await teardown(db);
  });

  test(`replication methods and properties`, async () => {
    expect.assertions(7);

    const db = await setup();
    const dbPouch = pouchSetup();
    const replication = db.replicate(dbPouch);

    expect(typeof replication.connect).toBe('function');
    expect(typeof replication.close).toBe('function');
    expect(typeof replication.destroy).toBe('function');
    expect(Array.isArray(replication.replicationStates)).toBe(true);
    expect(typeof replication.alive).toBe('boolean');
    expect(replication.alive$).toHaveProperty('subscribe');
    expect(typeof replication.alive$.subscribe).toBe('function');

    await teardown(replication, dbPouch, db);
  });
});

describe(`- Basic sync`, () => {
  test(`Sync works`, async () => {
    expect.assertions(3);

    const db = await setup();
    await db.collection(model('items'));

    const dbPouch = pouchSetup();
    const replication = db.replicate(dbPouch);
    await replication.connect();

    await db.collections.items.insert({ name: 'some' });
    const item = await db.collections.items.findOne().exec();
    await new Promise((resolve) => setTimeout(resolve, 3000));

    expect(db.replications.length).toBe(1);
    expect(replication.replicationStates.length).toBe(1);
    await expect(dbPouch.get(item._id)).resolves.toHaveProperty('name', 'some');

    await teardown(replication, dbPouch, db);
  });
  test(`Double sync works`, async () => {
    expect.assertions(3);

    const db = await setup();
    await db.collection(model('items'));

    const dbPouch1 = pouchSetup();
    const dbPouch2 = pouchSetup();
    const replication1 = db.replicate(dbPouch1);
    const replication2 = db.replicate(dbPouch2);
    await replication1.connect();
    await replication2.connect();

    await db.collections.items.insert({ name: 'some' });
    const item = await db.collections.items.findOne().exec();
    await new Promise((resolve) => setTimeout(resolve, 3000));

    expect(db.replications.length).toBe(2);
    await expect(dbPouch1.get(item._id)).resolves.toHaveProperty(
      'name',
      'some'
    );
    await expect(dbPouch2.get(item._id)).resolves.toHaveProperty(
      'name',
      'some'
    );

    await teardown(replication1, replication2, dbPouch1, dbPouch2, db);
  });
  test(`Selective sync works`, async () => {
    expect.assertions(3);

    const db = await setup();
    await db.collection(model('items'));
    await db.collection(model('elements'));

    const dbPouch = pouchSetup();
    const replication = db.replicate(dbPouch);
    await replication.connect();

    await db.collections.items.insert({ name: 'some' });
    const item = await db.collections.items.findOne().exec();
    await new Promise((resolve) => setTimeout(resolve, 3000));

    expect(replication.replicationStates.length).toBe(2);
    await expect(dbPouch.get(item._id)).resolves.toHaveProperty('name', 'some');
    await expect(db.collections.elements.find().exec()).resolves.toHaveLength(
      0
    );

    await teardown(replication, dbPouch, db);
  });
  test(`Collections selection works`, async () => {
    expect.assertions(2);

    const db = await setup();
    await db.collection(model('items'));
    await db.collection(model('elements'));

    const dbPouch = pouchSetup();
    const replication = db.replicate(dbPouch, ['items']);
    await replication.connect();

    await db.collections.elements.insert({ name: 'some' });
    await db.collections.items.insert({ name: 'some' });
    const item = await db.collections.items.findOne().exec();
    const element = await db.collections.elements.findOne().exec();
    await new Promise((resolve) => setTimeout(resolve, 3000));

    await expect(dbPouch.get(item._id)).resolves.toHaveProperty('name', 'some');
    await expect(dbPouch.get(element._id)).rejects.toThrow();

    await teardown(replication, dbPouch, db);
  });
  test(`replication.close() closes the connection`, async () => {
    expect.assertions(2);

    const db = await setup();
    await db.collection(model('items'));

    const dbPouch = pouchSetup();
    const replication = db.replicate(dbPouch);
    await replication.connect();
    await replication.close();

    await db.collections.items.insert({ name: 'some' });
    const item = await db.collections.items.findOne().exec();
    await new Promise((resolve) => setTimeout(resolve, 3000));

    expect(db.replications.length).toBe(1);
    await expect(dbPouch.get(item._id)).rejects.toThrow();

    await teardown(replication, dbPouch, db);
  });
  test(`replication.destroy() destroys replication`, async () => {
    expect.assertions(2);

    const db = await setup();
    await db.collection(model('items'));

    const dbPouch = pouchSetup();
    const replication = db.replicate(dbPouch);
    await replication.connect();
    await replication.destroy();

    await db.collections.items.insert({ name: 'some' });
    const item = await db.collections.items.findOne().exec();
    await new Promise((resolve) => setTimeout(resolve, 3000));

    expect(db.replications.length).toBe(0);
    await expect(dbPouch.get(item._id)).rejects.toThrow();

    await teardown(dbPouch, db);
  });
});
