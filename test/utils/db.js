import * as RxDB from 'rxdb';
import memory from 'pouchdb-adapter-memory';
import uuid from 'uuid/v4';
import registerUtils from '../../src';

RxDB.plugin(memory);
registerUtils(RxDB);

const nameGen = () => 'a' + uuid().replace(/[^a-zA-Z0-9]/g, '');

function setup() {
  return RxDB.create({
    name: nameGen(),
    adapter: 'memory',
    multiInstance: false,
    ignoreDuplicate: true
  });
}

function pouchSetup() {
  return new RxDB.PouchDB(nameGen(), { adapter: 'memory' });
}

function model(name) {
  return {
    name,
    schema: {
      version: 0,
      primaryPath: '_id',
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' }
      }
    }
  };
}

function teardown(...args) {
  return Promise.all(args.map((obj) => obj.destroy()));
}

export { setup as default, pouchSetup, teardown, model };
