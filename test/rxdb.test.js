import * as RxDB from 'rxdb';
import setup, { teardown, model } from './utils/db';

describe(`- Basic`, () => {
  test(`Exports PouchDB`, () => {
    expect(typeof RxDB.PouchDB).toBe('function');
  });
  test(`RxDocuments have doc._data property`, async () => {
    expect.assertions(5);

    const db = await setup();
    await db.collection(model('items'));
    await db.collections.items.insert({ name: 'hello', description: 'bye' });
    const item = await db.collections.items.findOne().exec();

    expect(item._data).not.toBe(undefined);
    expect(item._data).toHaveProperty('name', 'hello');
    expect(item._data).toHaveProperty('description', 'bye');
    expect(item._data).toHaveProperty('_rev');
    expect(item._data).toHaveProperty('_id');

    await teardown(db);
  });
});
describe(`- RxCollection.schema`, () => {
  test(`RxCollection.schema exists`, async () => {
    expect.assertions(1);

    const db = await setup();
    await db.collection(model('items'));

    expect(db.collections.items).toHaveProperty('schema');

    await teardown(db);
  });
  test(`Collections have schema.finalFields`, async () => {
    expect.assertions(3);

    const db = await setup();
    const data = model('items');
    data.schema.properties.some = {
      type: 'string',
      final: true
    };
    const collection = await db.collection(data);

    expect(collection.schema.finalFields).toContain('_id');
    expect(collection.schema.finalFields).toContain('some');
    expect(Object.keys(collection.schema.finalFields).length).toBe(2);

    await teardown(db);
  });
  test(`Collections have schema.jsonID.properties`, async () => {
    expect.assertions(8);

    const db = await setup();
    const collection = await db.collection(model('items'));

    expect(collection.schema).toHaveProperty('jsonID');
    expect(collection.schema.jsonID).toHaveProperty('properties');
    expect(collection.schema.jsonID.properties).toHaveProperty('name');
    expect(collection.schema.jsonID.properties).toHaveProperty('description');
    expect(collection.schema.jsonID.properties).toHaveProperty('_id');
    expect(collection.schema.jsonID.properties).toHaveProperty('_rev');
    expect(collection.schema.jsonID.properties).toHaveProperty('_attachments');
    expect(Object.keys(collection.schema.jsonID.properties).length).toBe(5);

    await teardown(db);
  });
});
