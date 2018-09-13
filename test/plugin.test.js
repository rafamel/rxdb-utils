import setup, { teardown, model } from './utils/db';
import { subscribableSymbol } from '../src/symbols';

test(`RxDocuments.collection has subscribable properties`, async () => {
  expect.assertions(6);

  const db = await setup();
  await db.collection(model('items'));
  await db.collections.items.insert({ name: 'hello', description: 'bye' });
  const item = await db.collections.items.findOne().exec();

  const arr = item.collection[subscribableSymbol];
  expect(Array.isArray(arr)).toBe(true);
  expect(arr.length).toBe(4);
  expect(arr).toContain('name');
  expect(arr).toContain('description');
  expect(arr).toContain('_rev');
  expect(arr).toContain('_attachments');

  await teardown(db);
});
