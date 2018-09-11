import setup, { teardown, model } from './utils/db';

describe(`- RxCollection`, () => {
  test(`collection.collections exists`, async () => {
    expect.assertions(3);

    const db = await setup();
    await db.collection(model('items'));

    expect(db.collections.items).not.toBe(undefined);
    expect(db.collections.items.collections).not.toBe(undefined);
    expect(typeof db.collections.items.collections).toBe('function');
    await teardown(db);
  });
  test(`collection.collections() returns collections`, async () => {
    expect.assertions(4);

    const db = await setup();
    await db.collection(model('items'));
    await db.collection(model('elements'));

    const itemsColls = Object.keys(db.collections.items.collections());
    const elementsColls = Object.keys(db.collections.elements.collections());

    expect(itemsColls).toContain('items');
    expect(itemsColls).toContain('elements');
    expect(elementsColls).toContain('items');
    expect(elementsColls).toContain('elements');
    await teardown(db);
  });
});

describe(`- RxDocument`, () => {
  test(`document.collections exists`, async () => {
    expect.assertions(2);

    const db = await setup();
    await db.collection(model('items'));
    await db.collections.items.insert({ name: 'some' });
    const item = await db.collections.items.findOne().exec();

    expect(item.collections).not.toBe(undefined);
    expect(typeof item.collections).toBe('function');
    await teardown(db);
  });
  test(`document.collections() returns collections`, async () => {
    expect.assertions(4);

    const db = await setup();
    await db.collection(model('items'));
    await db.collection(model('elements'));
    await db.collections.items.insert({ name: 'some' });
    await db.collections.elements.insert({ name: 'some' });
    const item = await db.collections.items.findOne().exec();
    const element = await db.collections.elements.findOne().exec();

    const itemColls = Object.keys(item.collections());
    const elementColls = Object.keys(element.collections());

    expect(itemColls).toContain('items');
    expect(itemColls).toContain('elements');
    expect(elementColls).toContain('items');
    expect(elementColls).toContain('elements');
    await teardown(db);
  });
});
