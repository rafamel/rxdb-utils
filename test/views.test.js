import setup, { teardown, model } from './utils/db';
import asyncUtil from 'async-test-util';
import * as Rx from 'rxjs';
import { map, take } from 'rxjs/operators';
import {
  CLOSE_SUBSCRIPTION_TIMEOUT,
  CHECK_KEEP_OPEN_TIMEOUT,
  ENSURE_CLEANUP_TIMEOUT
} from '../src/views/constants';

jest.setTimeout(25000);

const subsTimeout = () => {
  return new Promise((resolve) =>
    setTimeout(
      resolve,
      CHECK_KEEP_OPEN_TIMEOUT + CLOSE_SUBSCRIPTION_TIMEOUT + 250
    )
  );
};

describe(`RxDocument.view`, () => {
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

  test(`view.$, view.exec(), & view.promise resolve`, async () => {
    expect.assertions(3);

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
    await expect(item.element.promise).resolves.toBe(res);

    await teardown(db);
  });

  test(`view.exec() executes again, view.promise doesn't`, async () => {
    expect.assertions(9);

    let i = 0;
    const res = {};
    const db = await setup();
    const collection = await db.collection({
      ...model('items'),
      options: {
        views: {
          get element() {
            i++;
            return this.name$.pipe(map(() => res));
          }
        }
      }
    });
    const item = await collection.insert({});

    await expect(item.element.promise).resolves.toBe(res);
    await expect(item.element.exec()).resolves.toBe(res);
    expect(i).toBe(2);

    i = 0;
    const s = item.element.$.subscribe((x) => {
      /* do nothing */
    });

    await expect(item.element.promise).resolves.toBe(res);
    expect(i).toBe(0);
    await expect(item.element.exec()).resolves.toBe(res);
    expect(i).toBe(1);
    await expect(item.element.promise).resolves.toBe(res);
    expect(i).toBe(1);

    s.unsubscribe();
    await teardown(db);
  });

  test(`view.value throws outside of ensure$()`, async () => {
    expect.assertions(1);

    const res = {};
    const db = await setup();
    const collection = await db.collection({
      ...model('items'),
      options: {
        views: {
          get element() {
            return this.name$.pipe(map(() => res));
          }
        }
      }
    });
    const item = await collection.insert({});

    expect(() => item.element.value).toThrowError();

    await teardown(db);
  });
});

describe(`RxQuery.ensure$()`, () => {
  test(`ensure$() exists`, async () => {
    expect.assertions(2);

    const db = await setup();
    const collection = await db.collection({
      ...model('items')
    });

    expect(typeof collection.find().ensure$).toBe('function');
    expect(typeof collection.findOne().ensure$).toBe('function');

    await teardown(db);
  });

  test(`ensure$() throws on collections with no views`, async () => {
    expect.assertions(1);

    const db = await setup();
    const collection = await db.collection({
      ...model('items')
    });

    expect(() => collection.find().ensure$()).toThrowError();

    await teardown(db);
  });

  test(`ensure$() works for one + unensures properly`, async () => {
    expect.assertions(7);

    const res = {};
    const db = await setup();
    const collection = await db.collection({
      ...model('items'),
      options: {
        views: {
          get element() {
            return Rx.from(
              new Promise((resolve) => setTimeout(resolve, 1000))
            ).pipe(map(() => res));
          }
        }
      }
    });
    await collection.insert({});

    const init = Date.now();
    const item = await collection
      .findOne()
      .ensure$('element')
      .pipe(take(1))
      .toPromise();
    const end = Date.now();

    expect(end - init).toBeGreaterThanOrEqual(1000);
    expect(end - init).toBeLessThan(2000);
    expect(item.element.ensured).toBe(true);
    expect(() => item.element.value).not.toThrow();
    expect(item.element.value).toBe(res);
    await subsTimeout();

    expect(item.element.ensured).toBe(false);
    expect(() => item.element.value).toThrow();

    await teardown(db);
  });

  test(`ensure$() works with find() queries too + unensures properly`, async () => {
    expect.assertions(4);

    const db = await setup();
    const collection = await db.collection({
      ...model('items'),
      options: {
        views: {
          get element() {
            return Rx.of(1);
          }
        }
      }
    });
    const item = await collection.insert({});

    await collection
      .find()
      .ensure$('element')
      .pipe(take(1))
      .toPromise();

    expect(item.element.ensured).toBe(true);
    expect(() => item.element.value).not.toThrow();
    expect(item.element.value).toBe(1);
    await subsTimeout();

    expect(item.element.ensured).toBe(false);

    await teardown(db);
  });

  test(`ensure$() works for two + unensures properly`, async () => {
    expect.assertions(14);

    const db = await setup();
    const collection = await db.collection({
      ...model('items'),
      options: {
        views: {
          get element() {
            return Rx.from(
              new Promise((resolve) => setTimeout(resolve, 1000))
            ).pipe(map(() => 'a'));
          },
          get element2() {
            return Rx.from(
              new Promise((resolve) => setTimeout(resolve, 2000))
            ).pipe(map(() => 'b'));
          },
          get element3() {
            return Rx.from(
              new Promise((resolve) => setTimeout(resolve, 3000))
            ).pipe(map(() => 'c'));
          }
        }
      }
    });
    await collection.insert({});

    const init = Date.now();
    const item = await collection
      .findOne()
      .ensure$('element', 'element2')
      .pipe(take(1))
      .toPromise();
    const end = Date.now();

    expect(end - init).toBeGreaterThanOrEqual(2000);
    expect(end - init).toBeLessThan(3000);
    expect(() => item.element.value).not.toThrow();
    expect(() => item.element2.value).not.toThrow();
    expect(() => item.element3.value).toThrowError();
    expect(item.element.ensured).toBe(true);
    expect(item.element2.ensured).toBe(true);
    expect(item.element3.ensured).toBe(false);
    expect(item.element.value).toBe('a');
    expect(item.element2.value).toBe('b');

    await subsTimeout();
    expect(item.element.ensured).toBe(false);
    expect(item.element2.ensured).toBe(false);
    expect(() => item.element.value).toThrow();
    expect(() => item.element2.value).toThrow();

    await teardown(db);
  });

  test(`ensure$() fires immediately when another subscription is active`, async () => {
    expect.assertions(5);

    const res = {};
    const db = await setup();
    const collection = await db.collection({
      ...model('items'),
      options: {
        views: {
          get element() {
            return Rx.from(
              new Promise((resolve) => setTimeout(resolve, 2000))
            ).pipe(map(() => res));
          }
        }
      }
    });
    const item = await collection.insert({});

    const init1 = Date.now();
    let end1;
    const s1 = collection
      .findOne()
      .ensure$('element')
      .subscribe(() => !end1 && (end1 = Date.now()));
    await asyncUtil.waitUntil(() => end1);

    expect(end1 - init1).toBeGreaterThanOrEqual(2000);
    expect(end1 - init1).toBeLessThan(3000);
    expect(item.element.ensured).toBe(true);

    const init2 = Date.now();
    let end2;
    const s2 = collection
      .findOne()
      .ensure$('element')
      .subscribe(() => !end2 && (end2 = Date.now()));
    await asyncUtil.waitUntil(() => end2);

    expect(end2 - init2).toBeLessThan(2000);

    s1.unsubscribe();
    s2.unsubscribe();
    await subsTimeout();

    expect(item.element.ensured).toBe(false);

    await teardown(db);
  });

  test(`ensure$() selects all with no args + unensures properly`, async () => {
    expect.assertions(12);

    const db = await setup();
    const collection = await db.collection({
      ...model('items'),
      options: {
        views: {
          get element() {
            return Rx.of(1);
          },
          get element2() {
            return Rx.of(2);
          },
          get element3() {
            return Rx.of(3);
          }
        }
      }
    });
    await collection.insert({});

    const item = await collection
      .findOne()
      .ensure$()
      .pipe(take(1))
      .toPromise();

    expect(() => item.element.value).not.toThrow();
    expect(() => item.element2.value).not.toThrow();
    expect(() => item.element3.value).not.toThrow();
    expect(item.element.ensured).toBe(true);
    expect(item.element2.ensured).toBe(true);
    expect(item.element3.ensured).toBe(true);
    expect(item.element.value).toBe(1);
    expect(item.element2.value).toBe(2);
    expect(item.element3.value).toBe(3);

    await subsTimeout();
    expect(item.element.ensured).toBe(false);
    expect(item.element2.ensured).toBe(false);
    expect(item.element3.ensured).toBe(false);

    await teardown(db);
  });

  test(`unensures only when subscriptions to single ensure cease`, async () => {
    expect.assertions(4);

    const db = await setup();
    const collection = await db.collection({
      ...model('items'),
      options: {
        views: {
          get element() {
            return Rx.of(1);
          }
        }
      }
    });

    const item = await collection.insert({});

    const e = await collection.findOne().ensure$('element');
    const s1 = e.subscribe(() => {});
    const s2 = e.subscribe(() => {});

    await asyncUtil.waitUntil(() => item.element.ensured === true);
    expect(item.element.ensured).toBe(true);

    await subsTimeout();
    expect(item.element.ensured).toBe(true);

    s1.unsubscribe();
    await subsTimeout();
    expect(item.element.ensured).toBe(true);

    s2.unsubscribe();
    await subsTimeout();
    expect(item.element.ensured).toBe(false);

    await teardown(db);
  });

  test(`unensures only when subscriptions to multiple ensures cease`, async () => {
    expect.assertions(5);

    const db = await setup();
    const collection = await db.collection({
      ...model('items'),
      options: {
        views: {
          get element() {
            return Rx.of(1);
          },
          get element2() {
            return Rx.of(2);
          }
        }
      }
    });

    const item = await collection.insert({});

    const s1 = await collection
      .findOne()
      .ensure$('element', 'element2')
      .subscribe(() => {});
    const s2 = await collection
      .findOne()
      .ensure$('element')
      .subscribe(() => {});

    await asyncUtil.waitUntil(() => item.element.ensured === true);
    expect(item.element.ensured).toBe(true);
    expect(item.element2.ensured).toBe(true);

    s1.unsubscribe();
    await subsTimeout();
    expect(item.element.ensured).toBe(true);
    expect(item.element2.ensured).toBe(false);

    s2.unsubscribe();
    await subsTimeout();
    expect(item.element.ensured).toBe(false);

    await teardown(db);
  });

  test(`ensure$() can be reused once closed`, async () => {
    expect.assertions(4);

    const db = await setup();
    const collection = await db.collection({
      ...model('items'),
      options: {
        views: {
          get element() {
            return Rx.of(1);
          }
        }
      }
    });

    const item = await collection.insert({});

    const e = collection.findOne().ensure$('element');
    const s1 = e.subscribe(() => {});

    await asyncUtil.waitUntil(() => item.element.ensured === true);
    s1.unsubscribe();
    await subsTimeout();

    expect(item.element.ensured).toBe(false);

    const el = await e.pipe(take(1)).toPromise();
    expect(el.element.ensured).toBe(true);
    expect(el.element.value).toBe(1);

    await subsTimeout();
    expect(el.element.ensured).toBe(false);

    await teardown(db);
  });

  test(`unensures when query changes`, async () => {
    expect.assertions(5);

    const db = await setup();
    const collection = await db.collection({
      ...model('items'),
      options: {
        views: {
          get element() {
            return Rx.of(1);
          }
        }
      }
    });

    const item1 = await collection.insert({ name: 'first' });
    const s = await collection
      .findOne()
      .where({ name: { $eq: 'first' } })
      .ensure$('element')
      .subscribe(() => {});

    await asyncUtil.waitUntil(() => item1.element.ensured === true);
    expect(item1.element.ensured).toBe(true);

    await item1.update({ $set: { name: 'changed' } });
    const item2 = await collection.insert({ name: 'first' });

    await asyncUtil.waitUntil(() => item2.element.ensured === true);
    expect(item2.element.ensured).toBe(true);

    await new Promise((resolve) =>
      setTimeout(resolve, ENSURE_CLEANUP_TIMEOUT + 250)
    );

    expect(item1.element.ensured).toBe(false);
    expect(item2.element.ensured).toBe(true);

    s.unsubscribe();
    await subsTimeout();
    expect(item2.element.ensured).toBe(false);

    await teardown(db);
  });
});
