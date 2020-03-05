import setup, { teardown, model } from '../utils/db';
import * as Rx from 'rxjs';
import { subscribe } from 'promist';

test(`RxDocument.select$ exists`, async () => {
  const db = await setup();
  const items = await db.collection({
    ...model('items')
  });

  const item = await items.insert({});

  expect(typeof item.select$).toBe('function');
  expect(typeof item.select$).toBe('function');

  await teardown(db);
});
test(`first level data property`, async () => {
  const db = await setup();
  const items = await db.collection({
    ...model('items')
  });

  const item = await items.insert({
    name: 'hello',
    description: 'goodbye'
  });

  const q = await subscribe(item.select$('name'));

  expect(q).toHaveProperty('name', 'hello');
  expect(q).toHaveProperty('_');
  expect(Object.keys(q)).toHaveLength(2);
  expect(q._.collection).not.toBe(undefined);

  await teardown(db);
});
test(`first level data properties`, async () => {
  const db = await setup();
  const items = await db.collection({
    ...model('items')
  });

  const item = await items.insert({
    name: 'hello',
    description: 'goodbye'
  });

  const q = await subscribe(item.select$('name', 'description'));

  expect(q).toHaveProperty('name', 'hello');
  expect(q).toHaveProperty('description', 'goodbye');
  expect(q).toHaveProperty('_');
  expect(Object.keys(q)).toHaveLength(3);
  expect(q._.collection).not.toBe(undefined);

  await teardown(db);
});
test(`deep properties w/ mixed data, views, and observables in key`, async () => {
  expect.assertions(12);

  const db = await setup();
  const items = await db.collection({
    ...model('items'),
    options: {
      views: {
        get a() {
          return Rx.of({
            a: Rx.of({
              b: Rx.of('nice'),
              c: Rx.of('hello'),
              e: Rx.of({
                f: Rx.of('mint'),
                g: 'serious'
              })
            }),
            d: Rx.of('well'),
            h: 'element'
          });
        }
      }
    }
  });

  const item = await items.insert({
    name: 'hello',
    description: 'goodbye'
  });

  const q = await subscribe(
    item.select$('name', {
      description: true,
      a: [{ a: ['b', 'c', 'e'] }, 'a.e.f']
    })
  );

  expect(q).toHaveProperty('name', 'hello');
  expect(q).toHaveProperty('description', 'goodbye');
  expect(q.a).not.toBe(undefined);
  expect(q.a.a).not.toBe(undefined);
  expect(q.a.a.b).toBe('nice');
  expect(q.a.a.c).toBe('hello');
  expect(q.a.a.e).not.toBe(undefined);
  expect(q.a.a.e.f).toBe('mint');
  expect(q.a.a.e._.g).toBe('serious');
  expect(q.d).toBe(undefined);
  expect(q.a._.d).not.toBe(undefined);
  expect(q.a._.h).toBe('element');

  await teardown(db);
});
test(`none specified; all first level wo/ views`, async () => {
  expect.assertions(6);

  const db = await setup();
  const items = await db.collection({
    ...model('items')
  });

  const item = await items.insert({
    name: 'hello',
    description: 'goodbye'
  });

  const q = await subscribe(item.select$());

  expect(q).toHaveProperty('name', 'hello');
  expect(q).toHaveProperty('description', 'goodbye');
  expect(q).toHaveProperty('_id');
  expect(q).toHaveProperty('_rev');
  expect(q).toHaveProperty('_');
  expect(q._.collection).not.toBe(undefined);

  await teardown(db);
});
test(`none specified; all first level w/ views`, async () => {
  expect.assertions(8);

  const db = await setup();
  const items = await db.collection({
    ...model('items'),
    options: {
      views: {
        get a() {
          return Rx.of('mint');
        },
        get b() {
          return Rx.of('nice');
        }
      }
    }
  });

  const item = await items.insert({
    name: 'hello',
    description: 'goodbye'
  });

  const q = await subscribe(item.select$());

  expect(q).toHaveProperty('name', 'hello');
  expect(q).toHaveProperty('description', 'goodbye');
  expect(q).toHaveProperty('a', 'mint');
  expect(q).toHaveProperty('b', 'nice');
  expect(q).toHaveProperty('_id');
  expect(q).toHaveProperty('_rev');
  expect(q).toHaveProperty('_');
  expect(q._.collection).not.toBe(undefined);

  await teardown(db);
});
