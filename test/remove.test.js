import setup, { teardown, model } from './utils/db';

test(`RxDocument.remove() doesn't throw after removal`, async () => {
  expect.assertions(1);

  const db = await setup();
  await db.collection(model('items'));

  const item = await db.collections.items.insert({ name: 'some' });

  await item.remove();

  await expect(item.remove()).rejects.toThrow();
  await teardown(db);
});
