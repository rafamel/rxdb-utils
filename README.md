# rxdb-utils

[![Version](https://img.shields.io/github/package-json/v/rafamel/rxdb-utils.svg)](https://github.com/rafamel/rxdb-utils)
<!-- [![Build Status](https://travis-ci.org/rafamel/rxdb-utils.svg)](https://travis-ci.org/rafamel/rxdb-utils)
[![Coverage](https://img.shields.io/coveralls/rafamel/rxdb-utils.svg)](https://coveralls.io/github/rafamel/rxdb-utils)  -->
[![Dependencies](https://david-dm.org/rafamel/rxdb-utils/status.svg)](https://david-dm.org/rafamel/rxdb-utils)
[![Vulnerabilities](https://snyk.io/test/npm/rxdb-utils/badge.svg)](https://snyk.io/test/npm/rxdb-utils)
[![Issues](https://img.shields.io/github/issues/rafamel/rxdb-utils.svg)](https://github.com/rafamel/rxdb-utils/issues)
[![License](https://img.shields.io/github/license/rafamel/rxdb-utils.svg)](https://github.com/rafamel/rxdb-utils/blob/master/LICENSE)

<!-- markdownlint-disable MD036 -->
**RxDB's missing pieces**
<!-- markdownlint-enable MD036 -->

**ALPHA STAGE ALERT:** This library is still on its initial stages of development and not yet properly tested.

## Install

[`npm install rxdb-utils`](https://www.npmjs.com/package/rxdb-utils)

It's required to have `rxdb@7.7.1` installed in order to use `rxdb-utils`: `npm install rxdb@7.7.1`.

## Setup

`rxdb-utils` is comprised of a series of RxDB plugins to provide it with some missing functionality. You can see a usage example with React, along with [`rxdb-mobx`](https://www.npmjs.com/package/rxdb-mobx), [here](https://github.com/rafamel/rxdb-mobx/tree/master/example).

You can either register them one by one - choosing only those you'd like to add, or register them all with `register()`;

### Register all plugins

Keep in mind you also need to have `mobx` installed in order to use the `replication` plugin: `npm install mobx`

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
import models from 'rxdb-utils/models';
import collections from 'rxdb-utils/collections';
import defaultValues from 'rxdb-utils/default-values';
import timestamps from 'rxdb-utils/timestamps';
import hooks from 'rxdb-utils/hooks';
import replication from 'rxdb-utils/replication';

// Registering the usual pouchdb plugins
RxDB.plugin(memory);

// Registering rxdb-utils plugins one by one
RxDB.plugin(models);
RxDB.plugin(collections);
RxDB.plugin(defaultValues);
RxDB.plugin(timestamps);
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

### hooks

Allows to set up hooks within the collection definition. There is an obvious limitation, in that registering hooks with the native RxDB api will allow a more finegrained control over their execution. However, in the occasions this is not needed, it is rather convenient to have a straightforwards way of defining them. Additionally, `pre` hooks will receive the collection object as their second argument.

```javascript
db.collection({
  name: 'item',
  schema: {
    // ...schema goes here
  },
  options: {
    preInsert(doc, collection) { return doc; },
    postInsert(doc) { return doc; }
    preSave(doc, collection) { return doc; }
    postSave(doc) { return doc; },
    preRemove(doc, collection) { return doc; },
    postRemove(doc) { return doc; },
    postCreate(doc) { return doc; }
  }
});
```

### replication

You need to have `mobx` installed in order to use the `replication` plugin: `npm install mobx`.

Will allow for filtered replication of collections to a single remote instance. This would allow you to use a single remote pouchdb/couchdb database (per user, if applicable) to save all collections, instead of using one remote instance per user and collection.

In order to achieve so, all schemas will be modified by adding an `rx_model` property to all collections, which will be populated for all documents with the name of the collection. The key for this property will not change even if you activate key compression.

If you are adding this plugin while there's already a deployed system with data, you should up by one the version of all your collections and provide a [`migrationStrategies`](https://pubkey.github.io/rxdb/data-migration.html) which sets the `rx_model` property of existing documents to be the name of the collection.

`RxDatabase`s will now have:

- A `replicate(remote, collections, direction, options)` method, which will return an instance of the `Replication` class.
  - `remote` will be the `pouchdb` instance or remote database address we want to synchronize all our collections with.
  - `collections`: An optional array of strings with the names of the collections to be synchronized. If `null`/`undefined`, all database collections will be replicated.
  - `direction` and `options` are optional objects taking [the same properties as the `collection.sync()` method](https://pubkey.github.io/rxdb/replication.html), though the `filter` and `query_param` options can't be set as they are used internally.
- A `replications` property of type array, with all the instances of `Replication` created by calling `replicate()` on that database.

`Replication` instances can then be:

- Connected via `replication.connect()` (async). It will return a promise resolving to `true` if the connection is achieved on the first attempt, and `false` if it's not - nevertheless it will keep trying until closed.
- Stopped via `replication.close()` (async).
- Destroyed via `replication.destroy()` (async) - this will stop/close the replication and remove it from `database.replications`.

Additionally, they have the properties:

- `replicationStates`: An array of [`RxReplicationState`s](https://pubkey.github.io/rxdb/replication.html) for the synced collections of the database.
- `active`: Boolean. A mobx observer indicating whether the replication is active. Will be `false` when there are connectivity problems.
- `active$`: A TC39 observable stream. Same as `active`.

```javascript
const dbPromise = RxDB.create({
  name: 'mydb',
  adapter: 'idb',
  multiInstance: true,
  ignoreDuplicate: false
});

dbPromise.then((db) => {
  return db.replicate('http://localhost:5984/myremotedb/').connect();
});
```
