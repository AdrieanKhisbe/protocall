const path = require('path');
const test = require('ava');

const handlers = require('../src/handlers');

test('glob api', t => {
  const handler = handlers.glob();
  t.is(typeof handler, 'function');
  t.is(handler.length, 1);
});

test('glob basedir', async t => {
  const basedir = path.join(__dirname, 'fixtures');
  const handler = handlers.glob(basedir);

  const expected = [path.join(basedir, 'index.js')];

  const actual = await handler('**/*.js');
  t.is(actual.length, expected.length);
  t.is(actual[0], expected[0]);
});

test('glob options object', async t => {
  const basedir = path.join(__dirname, 'fixtures');
  const handler = handlers.glob({cwd: basedir});

  const expected = [path.join(basedir, 'index.js')];

  const actual = await handler('**/*.js');
  t.is(actual.length, expected.length);
  t.is(actual[0], expected[0]);
});

test('glob no options', async t => {
  const handler = handlers.glob();

  // Test no basedir
  const expected = [
    path.join(__dirname, 'fixtures', 'invalid.txt'),
    path.join(__dirname, 'fixtures', 'test.txt')
  ];

  const actual = await handler('**/*.txt');
  t.deepEqual(actual, expected);
});

test('glob no match', async t => {
  const handler = handlers.glob();

  // Test no basedir
  const actual = await handler('**/*.xls');
  t.is(actual.length, 0);
});
