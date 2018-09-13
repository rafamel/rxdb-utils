# rxdb-mobx

[![Version](https://img.shields.io/github/package-json/v/rafamel/rxdb-mobx.svg)](https://github.com/rafamel/rxdb-mobx)
[![Build Status](https://travis-ci.org/rafamel/rxdb-mobx.svg)](https://travis-ci.org/rafamel/rxdb-mobx)
[![Coverage](https://img.shields.io/coveralls/rafamel/rxdb-mobx.svg)](https://coveralls.io/github/rafamel/rxdb-mobx)
[![Dependencies](https://david-dm.org/rafamel/rxdb-mobx/status.svg)](https://david-dm.org/rafamel/rxdb-mobx)
[![Vulnerabilities](https://snyk.io/test/npm/rxdb-mobx/badge.svg)](https://snyk.io/test/npm/rxdb-mobx)
[![Issues](https://img.shields.io/github/issues/rafamel/rxdb-mobx.svg)](https://github.com/rafamel/rxdb-mobx/issues)
[![License](https://img.shields.io/github/license/rafamel/rxdb-mobx.svg)](https://github.com/rafamel/rxdb-mobx/blob/master/LICENSE)

<!-- markdownlint-disable MD036 -->
**Mobx and React integration for RxDB**
<!-- markdownlint-enable MD036 -->

## Install

[`npm install rxdb-mobx`](https://www.npmjs.com/package/rxdb-mobx)

* It's required to have `mobx` and `rxdb@^8.0.0` installed in order to use `rxdb-mobx`: `npm install mobx rxdb`.
* It's required to have `react` and `mobx-react` installed in order to use `rxdb-mobx` integrations with React: `npm install react mobx-react`.

## Setup

`mobx-react` is a RxDB plugin, so it should be registered just as any other.

```javascript
import * as RxDB from 'rxdb';
import memory from 'pouchdb-adapter-memory';
import mobx from 'rxdb-mobx';

RxDB.plugin(memory); // Registering the usual pouchdb plugins
RxDB.plugin(mobx); // Registering rxdb-mobx
```

## Usage

You can see a usage example with React, along with [`rxdb-utils`](https://www.npmjs.com/package/rxdb-utils), [here](https://github.com/rafamel/rxdb-mobx/tree/master/example).

Once you've registered `rxdb-mobx`, the properties of your documents will become mobx observables out of the box. However, dealing with queries and collection statics/methods that depend on query resolution gets a bit more complex.

All queries will be now [`onables`](#onables), meaning they will expose the methods `current`, `promise`, and `on`. For the simplest use case, `query.current()` will give you an observable for the query results. Please check [the documentation on `onables`](#onables) and, if your using it with React, [the react integration](#react).

### Onables

When defining [computed properties](#computed-properties) or methods dependent on query data, we'll want them to update as that data updated. We'll also want them to be able to build on each other, and be easily converted into promises for when we're dealing with actions.

For that reason, a database query, and `onables` derived from it, will expose the following methods:

* `current()`: An observable or an observable containing function. In all cases, it will update when observed with Mobx. It is guaranteed to return either `undefined` or a legitimate resolution of the onable chain. `current()` **should not be used in your collection computed properties, methods, or statics, but only in your views** [(this is done for you in React with `select`)](#react). In your collections, you should always use and return onables so you can continue to build on them and chain them with `on()`. Additionally, this allows `rxdb-mobx` to resolve potential computed properties circular dependencies.
* `promise()`: A promise returning the first result after all query/queries/promises have been resolved.
* `on(callback)`: Chaining method. Will return another `onable`. The callback will be called with the result of the parent onable it's chained to, and can return a value or another onable **but should never legitimately return `undefined`,** as that is what `rxdb-mobx` tracks to tag the resolution of onables. Callbacks cannot be async/promise returning. Observables can be freely used, however, so in the case you want some async functionality, you should define an observable out of the `.on()` chain and (conditionally?) populate it as desired.

Additionally, you can get a single onable built from an array of onables by using the `on()` function.

```javascript
import { on } from 'rxdb-mobx';

db.collection({
  name: 'item',
  schema: {
    version: 0,
    primaryPath: '_id',
    type: 'object',
    properties: {
      name: { type: 'string' },
      description: { type: 'string' },
      category: { type: 'string' },
      warehouse_id: { type: 'string', ref: 'frequency' }
    }
  },
  methods: {
    sameWarehouse() {
      return this.collection
        .find()
        .where({ warehouse_id: { $eq: this.warehouse_id } })
        .on(docs => {
          // You would do this on the query itself usually,
          // just here for demonstration purposes on how you would deal
          // with manipulating data inside a collection method by using
          // .on on a query/onable.
          return docs
            .filter(doc => doc._id !== this._id);
        });
    },
    sameCategory() {
      return this.collection
        .find()
        .where({ category: { $eq: this.category } })
        .on(docs => {
          return docs
            .filter(doc => doc._id !== this._id);
        });
    },
    sameCaterogyAndWarehouse() {
      // You would usually deal with this by just making a separate query
      // that incorporated both restrictions, just here to demonstrate
      // how you would use on()
      return on([this.sameWarehouse(), this.sameCategory()])
        .on(([sameWarehouse, sameCategory]) => {
          return { sameWarehouse, sameCategory };
        });
    }
  }
});
```

### Computed properties

You can define a set of computed properties for documents to have on a collection. These will also be observable properties, and can be used to pre-populate our documents with its relationships.

Computed properties can have circular dependencies both with other computed properties and other collections. They will always be safe to use and populated as long as the documents are retrieved via the `computed()` or `promise()` method of a query/onable.

They are defined as getters, and can return any value but `null` and `undefined`. Computer properties should **never** legitimately return `null` or `undefined`, as both values will trigger a cache response to avoid errors when syncing and elimination of resources ocurrs in a non defined random order. If they return an onable, the property of the document will be set to the `current()` value/observer of the onable.

```javascript
db.collection({
  name: 'item',
  schema: {
    version: 0,
    primaryPath: '_id',
    type: 'object',
    properties: {
      name: { type: 'string' },
      description: { type: 'string' },
      frequency_id: { type: 'string', ref: 'frequency' }
    }
  },
  options: {
    computed: {
      get upperName() {
        return this.name.toUppercase();
      },
      get frequency() {
        return this.collection.database.collections.frequency.findOne(this.frequency_id);
      }
    }
  }
});
```

### React

#### Provider

The `Provider` component takes in the props:

* `db`: *Promise (resolving in the db object or null), db object, or null.* You can pass the RxDB database object (or directly its collections) here. Children of `Provider` won't first mount until the promise resolves. A new context will be created and you'll be able to access the database object on your components via `withDB` and `select`.
* `hide`: *Boolean (optional),* defaults to `false`. Whether to hide `Provider`'s children until the data for all inner components wrapped by `select` has returned.
* `onMountOrNull`: *Function (optional).* A callback that will be called on `Provider`'s mount, or whenever the `db` prop switchs to `null`.
* `onReadyOrUnmount`: *Function (optional).* A callback that will be called once the `db` promises first resolves to a non-`null` value or `Provider` is unmounted.
* `defaults`: *Object (optional),* the default `onMount` and `onReadyOrUnmount` that will be applied to `select`ed components. With keys:
  * `onMount`: *Function (optional).* A callback to be called on all inner `select`s mount.
  * `onReadyOrUnmount`: *Function (optional).* A callback to be called on all inner `select`s first data resolution or unmount.

#### withDB(Component)

Allows you to access the `db` within the `Provider` context.

#### select(callback, onMount, onReadyOrUnmount)(Component)

Will only mount after the db promise is resolved. Will only display the components once all the children data is ready for the first time.
