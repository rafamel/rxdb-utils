import setup, { teardown, model } from './utils/db';
import * as Rx from 'rxjs';
import { map, take } from 'rxjs/operators';

test(`Observables are registered`, async () => {
  expect.assertions(6);

  const db = await setup();
  await db.collection({
    ...model('items'),
    options: {
      observables: {
        ex1(n) {
          return Rx.of(n);
        },
        ex2: {
          $(n) {
            return Rx.of(n);
          },
          get(n) {
            return n;
          }
        }
      }
    }
  });
  const item = await db.collections.items.insert({});

  expect(item.ex1).not.toBe(undefined);
  expect(typeof item.ex1).toBe('function');
  expect(item.ex1.get).toBe(undefined);

  expect(item.ex2).not.toBe(undefined);
  expect(typeof item.ex2).toBe('function');
  expect(typeof item.ex2.get).toBe('function');

  await teardown(db);
});

describe(`- Observables emit`, () => {
  test(`Bare observable`, async () => {
    expect.assertions(2);

    const db = await setup();
    await db.collection({
      ...model('items'),
      options: {
        observables: {
          ex1(n) {
            return this.name$.pipe(map((name) => name + n));
          }
        }
      }
    });
    const item = await db.collections.items.insert({ name: 'example' });

    const x = item.ex1(1);
    await expect(x.$.pipe(take(1)).toPromise()).resolves.toBe('example1');
    await expect(x.exec()).resolves.toBe('example1');

    await teardown(db);
  });
  test(`Observable w/ sync get`, async () => {
    expect.assertions(3);

    const db = await setup();
    await db.collection({
      ...model('items'),
      options: {
        observables: {
          ex1: {
            $(n) {
              return this.name$.pipe(map((name) => ({ name, n })));
            },
            get({ name, n }) {
              return name + n;
            }
          }
        }
      }
    });
    const item = await db.collections.items.insert({ name: 'example' });

    expect(item.ex1.get({ name: 'some', n: 2 })).toBe('some2');

    const x = item.ex1(1);
    await expect(x.$.pipe(take(1)).toPromise()).resolves.toBe('example1');
    await expect(x.exec()).resolves.toBe('example1');

    await teardown(db);
  });
});

describe(`- Works properly`, () => {
  test(`async get`, async () => {
    expect.assertions(2);

    const db = await setup();
    await db.collection({
      ...model('items'),
      options: {
        observables: {
          ex1: {
            $(n) {
              return Rx.of(n);
            },
            async get(n) {
              return n + 1;
            }
          }
        }
      }
    });
    const item = await db.collections.items.insert({});

    await expect(item.ex1(1).exec()).resolves.toBe(2);
    await expect(item.ex1.get(1)).resolves.toBe(2);

    await teardown(db);
  });
  test(`this is maintained`, async () => {
    expect.assertions(3);

    const db = await setup();
    await db.collection({
      ...model('items'),
      options: {
        observables: {
          ex1() {
            return Rx.of(this);
          },
          ex2: {
            $() {
              return Rx.of(this);
            },
            get() {
              return this;
            }
          }
        }
      }
    });
    const item = await db.collections.items.insert({ name: 'example' });

    await expect(item.ex1().exec()).resolves.toHaveProperty('name', 'example');
    await expect(item.ex2().exec()).resolves.toHaveProperty('name', 'example');
    expect(item.ex2.get().name).toBe('example');

    await teardown(db);
  });

  test(`Piping gets`, async () => {
    expect.assertions(4);

    const db = await setup();
    await db.collection({
      ...model('items'),
      options: {
        observables: {
          ex1(n) {
            return Rx.of(n).pipe(
              map((n) => {
                n++;
                n = this.ex2.get(n);
                return n;
              })
            );
          },
          ex2: {
            $(n) {
              return Rx.of(n);
            },
            get(n) {
              return n + 1;
            }
          },
          ex3: {
            $(n) {
              return Rx.of(n);
            },
            async get(n) {
              n = await this.ex4.get(n);
              return n + 1;
            }
          },
          ex4: {
            $(n) {
              return Rx.of(n);
            },
            async get(n) {
              return n + 1;
            }
          }
        }
      }
    });
    const item = await db.collections.items.insert({});

    await expect(item.ex1(1).exec()).resolves.toBe(3);
    await expect(item.ex2(1).exec()).resolves.toBe(2);
    await expect(item.ex3(1).exec()).resolves.toBe(3);
    await expect(item.ex4(1).exec()).resolves.toBe(2);

    await teardown(db);
  });
});
