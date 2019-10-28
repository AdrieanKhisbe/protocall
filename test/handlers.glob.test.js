const path = require('path');
const test = require('ava');

const handlers = require('../src/handlers');

test('glob api', t => {
  const handler = handlers.glob();
  t.is(typeof handler, 'function');
  t.is(handler.length, 2);
});

test.cb('glob basedir', t => {
  const basedir = path.join(__dirname, 'fixtures');
  const handler = handlers.glob(basedir);

  const expected = [path.join(basedir, 'index.js')];

  handler('**/*.js', function(err, actual) {
    t.falsy(err);
    t.is(actual.length, expected.length);
    t.is(actual[0], expected[0]);
    t.end();
  });
});

test.cb('glob options object', t => {
  const basedir = path.join(__dirname, 'fixtures');
  const handler = handlers.glob({cwd: basedir});

  const expected = [path.join(basedir, 'index.js')];

  handler('**/*.js', function(err, actual) {
    t.is(err, null);
    t.is(actual.length, expected.length);
    t.is(actual[0], expected[0]);
    t.end();
  });
});

test.cb('glob no options', t => {
  const handler = handlers.glob();

  // Test no basedir
  const expected = [
    path.join(__dirname, 'fixtures', 'invalid.txt'),
    path.join(__dirname, 'fixtures', 'test.txt')
  ];

  handler('**/*.txt', function(err, actual) {
    t.is(err, null);
    t.deepEqual(actual, expected);
    t.end();
  });
});

test.cb('glob no match', t => {
  const handler = handlers.glob();

  // Test no basedir
  handler('**/*.xls', function(err, actual) {
    t.is(err, null);
    t.is(actual.length, 0);
    t.end();
  });
});
