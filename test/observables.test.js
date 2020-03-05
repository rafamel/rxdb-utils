import setup, { teardown, model } from './utils/db';
import { of } from 'rxjs';
import { map } from 'rxjs/operators';
import { subscribe } from 'promist';

test(`observables are registered`, async () => {
  const db = await setup();
  await db.collection({
    ...model('items'),
    options: {
      observables: {
        ex1: (n) => of(n),
        ex2: {
          $: (n) => of(n),
          get: (n) => n
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
test(`bare observable emits`, async () => {
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
  await expect(subscribe(x.$)).resolves.toBe('example1');
  await expect(x.exec()).resolves.toBe('example1');

  await teardown(db);
});
test(`observable w/ sync get emits`, async () => {
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
  await expect(subscribe(x.$)).resolves.toBe('example1');
  await expect(x.exec()).resolves.toBe('example1');

  await teardown(db);
});
test(`async get succeeds`, async () => {
  const db = await setup();
  await db.collection({
    ...model('items'),
    options: {
      observables: {
        ex1: {
          $: (n) => of(n),
          get: async (n) => n + 1
        }
      }
    }
  });
  const item = await db.collections.items.insert({});

  await expect(item.ex1(1).exec()).resolves.toBe(2);
  await expect(item.ex1.get(1)).resolves.toBe(2);

  await teardown(db);
});
test(`this context is maintained`, async () => {
  const db = await setup();
  await db.collection({
    ...model('items'),
    options: {
      observables: {
        ex1() {
          return of(this);
        },
        ex2: {
          $() {
            return of(this);
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

test(`piping gets succeeds`, async () => {
  const db = await setup();
  await db.collection({
    ...model('items'),
    options: {
      observables: {
        ex1(n) {
          return of(n).pipe(
            map((n) => {
              n++;
              n = this.ex2.get(n);
              return n;
            })
          );
        },
        ex2: {
          $: (n) => of(n),
          get: (n) => n + 1
        },
        ex3: {
          $: (n) => of(n),
          async get(n) {
            return this.ex4.get(n).then((n) => n + 1);
          }
        },
        ex4: {
          $: (n) => of(n),
          get: async (n) => n + 1
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
