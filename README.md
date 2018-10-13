# rxdb-utils

[![Version](https://img.shields.io/github/package-json/v/rafamel/rxdb-utils.svg)](https://github.com/rafamel/rxdb-utils)
[![Build Status](https://travis-ci.org/rafamel/rxdb-utils.svg)](https://travis-ci.org/rafamel/rxdb-utils)
[![Coverage](https://img.shields.io/coveralls/rafamel/rxdb-utils.svg)](https://coveralls.io/github/rafamel/rxdb-utils)
[![Dependencies](https://david-dm.org/rafamel/rxdb-utils/status.svg)](https://david-dm.org/rafamel/rxdb-utils)
[![Vulnerabilities](https://snyk.io/test/npm/rxdb-utils/badge.svg)](https://snyk.io/test/npm/rxdb-utils)
[![Issues](https://img.shields.io/github/issues/rafamel/rxdb-utils.svg)](https://github.com/rafamel/rxdb-utils/issues)
[![License](https://img.shields.io/github/license/rafamel/rxdb-utils.svg)](https://github.com/rafamel/rxdb-utils/blob/master/LICENSE)

<!-- markdownlint-disable MD036 -->
**RxDB's missing pieces**
<!-- markdownlint-enable MD036 -->

## Install

[`npm install rxdb-utils`](https://www.npmjs.com/package/rxdb-utils)

It's required to have `rxdb@^8.0.0` and `rxjs@^6.0.0` installed in order to use `rxdb-utils`: `npm install rxdb rxjs`.

## Setup

`rxdb-utils` is comprised of a series of RxDB plugins to provide it with some missing functionality.

You can either register them one by one - choosing only those you'd like to add, or register them all with `register()`;

### Register all plugins

```javascript
import * as RxDB from 'rxdb';
import memory from 'pouchdb-adapter-memory';
import register from 'rxdb-utils';

RxDB.plugin(memory); // Registering the usual pouchdb plugins
register(RxDB); // Registering all plugins provided by rxdb-utils
```

### Register plugins one by one

```javascript
import * as RxDB from 'rxdb';
import memory from 'pouchdb-adapter-memory';
// rxdb-utils imports
import models from 'rxdb-utils/models';
import collections from 'rxdb-utils/collections';
import defaultValues from 'rxdb-utils/default-values';
import timestamps from 'rxdb-utils/timestamps';
import views from 'rxdb-utils/views';
import select from 'rxdb-utils/select';
import observables from 'rxdb-utils/observables';
import hooks from 'rxdb-utils/hooks';
import replication from 'rxdb-utils/replication';

// Registering the usual pouchdb plugins
RxDB.plugin(memory);

// Registering rxdb-utils plugins one by one
RxDB.plugin(models);
RxDB.plugin(collections);
RxDB.plugin(defaultValues);
RxDB.plugin(timestamps);
RxDB.plugin(views);
RxDB.plugin(select);
RxDB.plugin(observables);
RxDB.plugin(hooks);
RxDB.plugin(replication);
```

## Plugins

## models

Will allow you to batch create collections on a database from an array of models.

Adds the `models()` method to `RxDatabase`s, which returns a promise that resolves with the database instance once all collections have been created.

```javascript
const item = {
  name: 'item',
  schema: {
    // ...schema goes here
  }
};

const folder = {
  name: 'folder',
  schema: {
    // ...schema goes here
  }
};

// Create database
const dbPromise = RxDB.create({
  name: 'mydb',
  adapter: 'idb',
  multiInstance: true,
  ignoreDuplicate: false
})
  // Register all collections at once
  .then((db) => db.models([item, folder]));
```

### collections

Will make available a `collections()` method for both `RxCollection` and `RxDocument`. This is just a matter of convenience, as database collections are by default accesible on the path `this.database.collections` on collections, and `this.collection.database.collections` on documents.

### defaultValues

Allows for default values definition within the collection object, as an object itself rather than as part of the schema. Internally, this is nothing more than a `preInsert` hook.

```javascript
db.collection({
  name: 'item',
  schema: {
    version: 0,
    primaryPath: '_id',
    type: 'object',
    properties: {
      name: { type: 'string' },
      description: { type: 'string' }
    }
  },
  options: {
    defaultValues: {
      name: 'My default name'
    }
  }
});
```

### timestamps

It will add `createdAt` and `updatedAt` properties of type `date-time` to all collections with a truthy `timestamps` option, and populate them on `insert` and `save` with a date ISO string accordingly.

If you are adding timestamps to a collection with existent data, you should up by one the version of your collection and provide a [`migrationStrategies`](https://pubkey.github.io/rxdb/data-migration.html).

```javascript
db.collection({
  name: 'item',
  schema: {
    // ...schema goes here
  },
  options: {
    // This will activate timestamps for this model
    timestamps: true
  }
});
```

### views

The views plugin allows you to create subscribable computed getter methods for a collection. View getters **must return an observable**. They can contain relationships or any other computation for a `RxDocument` instance.

#### Definition

```javascript
db.collection({
  name: 'item',
  schema: {
    // ...schema goes here
  },
  options: {
    views: {
      get frequency() {
        return this.frequency_id$.pipe(
          switchMap(
            (id) => this.collection.database.collections.frequency.find(id).$
          ),
          filter((x) => x) // Filter prevents null when removing item & frequency
        );
      }
    }
  }
});
```

#### Access

Similarly to the `observables` plugin, computed properties have an inner observable `$` and the `exec()` method, plus some additional values:

* `view.$`: `Observable`. When subscribed, it will hold the computed value so it won't recalculate on each subscription -until the inner subscription values change.
* `view.promise`: `Promise`. It will use the last value returned by the observable (if it was observed and it exists), or recalculate otherwise.
* `view.exec()`: When using the promise returning method `exec()`, it will recalculate instead of using the cached values.
* `view.value`: Holds the property value **only if** the document is part of a query that ensured the availability of this property via `RxQuery.ensure$()`. Otherwise, it will throw.

```javascript
// Subscribing
doc.frequency.$.subscribe(frequency =>
  console.log("Item's frequency", frequency)
);
// Getting it as a promise
doc.frequency.exec().then(frequency =>
  console.log("Item's frequency", frequency)
);
```

#### `RxQuery.ensure$(...names)`

The views plugin also provides the `ensure$()` method for queries. It is a convenient way of ensuring the availability of computed properties (`views`) when getting a set of `RxDocument`s.

`ensure$()` takes a set of *string*s with the names of the `views` you want to ensure will be readily available upon emition and keep alive while not directly subscribed to. If no arguments are passed, all the defined `views` for the `RxCollection` will be ensured.

When using it, the query won't resolve until all the specified `views` have emitted at least once -so there's a result available. Of course, this means first query resolution will take longer, and computations will be performed while you might not be using it in your views -they will update even if there's no subscription, so they're always available to their latest values. It's a good tool to use only when aware of the trade-offs, depending on your application needs, the load of the computations to be performed, and where in your application flow you want to perform them.

```javascript
// Ensuring all my collection views
collection.find().ensure$()
  .subscribe(item => /* do something */);

// Ensuring only two collection views
collection.find().ensure$('frequency', 'other')
  .subscribe(item => /* do something */);
```

### select

Allows to straightforwardly select observable properties from a `RxDocument`.

`RxDocument.select$()` returns an observable that returns an object with all selected properties, with the parent in key `_`. Selected properties should be passed without the `$` sufix. It is compatible with the `views` plugin.

Takes in any number of arguments defining the selected properties either as strings or objects.

```javascript
// Assuming a RxDocument with properties/views 'name', 'description',
// and 'frequency', and that 'frequency' points to another RxDocument
// with properties/views 'data', 'other_property', and 'some_other_property'

const obs$ = doc.select$(
  'name',
  'description',
  { frequency: ['data', 'other_property'] },
  'frequency.some_other_property'
);
```

`obs$` will only emit for updates on those properties, and return an object such as:

```javascript
({
  _: RxDocument,
  name: ...,
  description: ...,
  frequency: {
    _: RxDocument,
    data: ...,
    other_property: ...,
    some_other_property: ...
  }
})
```

### observables

Allows to define observable returning methods in a collection model. Of course, you can already do this via the usual `methods` key, however, the `observables` plugin introduces a few additional perks.

To use it, define your observable returning methods in the `options.observables` key of your collection model, and subscribe to them via `RxDocument.method().$`. To turn the first observable emittion into a promise, do `RxDocument.method().exec()`.

As you've noticed, the calls to the methods defined with `observables` return an object with an observable (`$`) and a promise returning method (`exec`).

```javascript
import { map } from 'rxjs/operators';

db.collection({
  name: 'item',
  schema: {
    // ...schema goes here
  },
  options: {
    observables: {
      addToName(string) {
        return this.name$.pipe(
          map(name => name + string)
        );
      }
    }
  }
});
```

Additionally, when building complex applications, it could be that several observable returning methods you define use other observable returning methods, meaning, they might be interdependent. Say you have `method1`, which depends on data provided by `method2` and `method3`, but `method2` does also depend on data provided by `method3`. To prevent `method3` from being called several times without maintaining a `Subject`, the `observable` plugin allows you to define an object containing the subscribable part of the function in key `$` as an observable returning function, mapping to a synchronous function in key `get` that should take in all data needed, and accessible via `RxDocument.method.get()`. This way, subscribers will only be set for the method that is actually called, which will provide all data to inner methods.

```javascript
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

db.collection({
  name: 'item',
  schema: {
    // ...schema goes here
  },
  options: {
    observables: {
      method1_userInfo(extraStr, hidden) {
        return combineLatest(this.name$, this.description$).pipe(
          map(([name, description]) => {
            const hide = this.method3_doHide.get({ name, hidden });
            const nameExtra = this.method2_nameExtra
              .get({ name, hidden, extraStr });

            return `name: ${nameExtra}, description: ${
              hide ? 'Who knows!?' : description
            }`;
          })
        );
      },
      method2_nameExtra: {
        $(extraStr = 'is great!', hidden) {
          return this.name$.pipe(map(name => ({ name, hidden, extraStr })));
        },
        get({ name, hidden, extraStr }) {
          const hide = this.method3_doHide.get({ name, hidden });
          return hide ? 'No-one' : `${hName} ${extraStr}`;
        }
      },
      method3_doHide: {
        $(hidden = ['John', 'Silver', 'Pope', 'Lazarus']) {
          return this.name$.pipe(map(name => ({ name, hidden })));
        },
        get({ name, hidden }) {
          // Let's imagine this is a complex computation
          // and all this is worth to be optimized for
          return hidden.includes(name);
        }
      }
    }
  }
});
```

Then you can call and subscribe to these via `RxDocument.method1_userInfo(...).$`, `RxDocument.method2_nameExtra(...).$`, and `RxDocument.method3_doHide(...).$`.

### hooks

Allows to set up hooks within the collection definition. There is an obvious limitation, in that registering hooks with the native RxDB api will allow a more finegrained control over their execution. However, in the occasions this is not needed, it is rather convenient to have a straightforwards way of defining them. Additionally, `pre` hooks will receive the collection object as their second argument.

Hooks defined this way **will also be inherited by *inMemory* collections.**

```javascript
db.collection({
  name: 'item',
  schema: {
    // ...schema goes here
  },
  options: {
    hooks: {
      preInsert(data, collection) { /* Do stuff */ },
      postInsert(data, doc) { /* Do stuff */ },
      preSave(data, doc) { /* Do stuff */ },
      postSave(data, doc) { /* Do stuff */ },
      preRemove(data, doc) { /* Do stuff */ },
      postRemove(data, doc) { /* Do stuff */ },
      postCreate(data, doc) { /* Do stuff */ }
    }
  }
});
```

### replication

Will allow for filtered replication of collections to a single remote instance. This would allow you to use a single remote pouchdb/couchdb database (per user, if applicable) to save all collections, instead of using one remote instance per user and collection.

In order to achieve so, all schemas will be modified by adding an `rx_model` property to all collections, which will be populated for all documents with the name of the collection. The key for this property will not change even if you activate key compression.

If you are adding this plugin while there's already a deployed system with data, you should up by one the version of all your collections and provide a [`migrationStrategies`](https://pubkey.github.io/rxdb/data-migration.html) which sets the `rx_model` property of existing documents to be the name of the collection.

`RxDatabase`s will now have:

* A `replicate(remote, collections, direction, options)` method, which will return an instance of the `Replication` class.
  * `remote` will be the `pouchdb` instance or remote database address we want to synchronize all our collections with.
  * `collections`: An optional array of strings with the names of the collections to be synchronized. If `null`/`undefined`, all database collections will be replicated.
  * `direction` and `options` are optional objects taking [the same properties as the `collection.sync()` method](https://pubkey.github.io/rxdb/replication.html), though the `filter` and `query_param` options can't be set as they are used internally.
* A `replications` property of type array, with all the instances of `Replication` created by calling `replicate()` on that database.

`Replication` instances can then be:

* Connected via `replication.connect()` (async). It will return a promise resolving to `true` if the connection is achieved on the first attempt, and `false` if it's not - nevertheless it will keep trying until closed.
* Stopped via `replication.close()` (async).
* Destroyed via `replication.destroy()` (async) - this will stop/close the replication and remove it from `database.replications`.

Additionally, they have the properties:

* `replicationStates`: An array of [`RxReplicationState`s](https://pubkey.github.io/rxdb/replication.html) for the synced collections of the database.
* `alive`: Boolean. Indicates whether the replication is alive. Will be `false` when there are connectivity problems.
* `alive$`: A RxJS observable stream. Same as `alive`.

```javascript
const dbPromise = RxDB.create({
  name: 'mydb',
  adapter: 'idb',
  multiInstance: true,
  ignoreDuplicate: false
});

dbPromise
  .then((db) => {
    // Register collections before running db.replicate()

    db.collection({ /* ... */ });
    // or via the models plugin
    db.models([{ /* ... */ }, { /* ... */ }]);

    return db;
  })
  .then((db) => {
    return db.replicate('http://localhost:5984/myremotedb/').connect();
  });
```
