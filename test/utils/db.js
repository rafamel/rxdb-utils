import * as RxDB from 'rxdb';
import memory from 'pouchdb-adapter-memory';
import http from 'pouchdb-adapter-http';
import uuid from 'uuid/v4';
import { wait } from 'promist';
import { spawn } from 'child_process';
import registerUtils from '../../src';

RxDB.plugin(memory);
RxDB.plugin(http);
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

let waitFirstRun;
function server() {
  const cmd = /^win/.test(process.platform)
    ? 'pouchdb-server.cmd'
    : 'pouchdb-server';
  const port = String(Math.floor(Math.random() * (5995 - 5005 + 1) + 5005));
  const run = async () => {
    if (!waitFirstRun) waitFirstRun = wait(10000);
    await waitFirstRun;
    return spawn(cmd, ['-p', port, '-m']);
  };

  return {
    run,
    url: `http://127.0.0.1:${port}/test`
  };
}

export { setup as default, pouchSetup, server, teardown, model };
