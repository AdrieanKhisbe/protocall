const test = require('ava');

const handlers = require('../src/handlers');

const regexpHandler = handlers.regexp();

test('env api', t => {
  t.is(typeof regexpHandler, 'function');
  t.is(regexpHandler.length, 1);
});

test('regex simple one with no delimiter', t => {
  t.deepEqual(regexpHandler('.*'), /.*/);
  t.deepEqual(regexpHandler('/.*'), /\/.*/);
  t.deepEqual(regexpHandler('.*/'), /.*\//);
});

test('regex complex one with delimiter and flags', t => {
  t.deepEqual(regexpHandler('/.*/'), /.*/);
  t.deepEqual(regexpHandler('/.*/gi'), /.*/gi);
});
