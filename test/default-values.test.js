import setup, { teardown, model } from './utils/db';

test(`values are inserted`, async () => {
  const db = await setup();
  await db.collection({
    ...model('items'),
    options: {
      defaultValues: {
        name: 'myName',
        description: 'myDescription'
      }
    }
  });
  await db.collections.items.insert({});
  const item = await db.collections.items.findOne().exec();

  expect(item.name).toBe('myName');
  expect(item.description).toBe('myDescription');
  await teardown(db);
});
test(`explicit values override defaults`, async () => {
  const db = await setup();
  await db.collection({
    ...model('items'),
    options: {
      defaultValues: {
        name: 'myName',
        description: 'myDescription'
      }
    }
  });
  await db.collections.items.insert({ description: 'anotherDescription' });
  const item = await db.collections.items.findOne().exec();

  expect(item.name).toBe('myName');
  expect(item.description).toBe('anotherDescription');
  await teardown(db);
});
