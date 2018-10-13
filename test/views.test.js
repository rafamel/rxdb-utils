import setup, { teardown, model } from './utils/db';
import asyncUtil from 'async-test-util';
import * as Rx from 'rxjs';
import { map } from 'rxjs/operators';

test(`Views are registered`, async () => {
  expect.assertions(4);

  const db = await setup();
  await db.collection({
    ...model('items'),
    options: {
      views: {
        get element() {
          return Rx.of();
        }
      }
    }
  });
  const item = await db.collections.items.insert({});

  expect(item.element).not.toBe(undefined);
  expect(Rx.isObservable(item.element.$)).toBe(true);
  expect(item.element).toHaveProperty('exec');
  expect(item.element.exec()).toBeInstanceOf(Promise);
  await teardown(db);
});

test(`RxDocument.view.$ & RxDocument.view.exec() resolve`, async () => {
  expect.assertions(2);

  const res = {};
  const db = await setup();
  await db.collection({
    ...model('items'),
    options: {
      views: {
        get element() {
          return this.name$.pipe(map(() => res));
        }
      }
    }
  });
  const item = await db.collections.items.insert({});

  let ans;
  const s = item.element.$.subscribe((x) => (ans = x));
  await asyncUtil.waitUntil(() => ans);
  s.unsubscribe();

  expect(ans).toBe(res);
  await expect(item.element.exec()).resolves.toBe(res);

  await teardown(db);
});

test.only(`RxDocument.view.$ & RxDocument.view.exec() resolve`, async () => {
  expect.assertions(2);

  const res = {};
  const db = await setup();
  await db.collection({
    ...model('items'),
    options: {
      views: {
        get element() {
          return this.name$.pipe(map(() => res));
        }
      }
    }
  });
  const item = await db.collections.items.insert({});

  let ans;
  const s = item.element.$.subscribe((x) => (ans = x));
  await asyncUtil.waitUntil(() => ans);
  s.unsubscribe();

  expect(ans).toBe(res);
  await expect(item.element.exec()).resolves.toBe(res);

  await teardown(db);
});
