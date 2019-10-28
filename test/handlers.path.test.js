const path = require('path');
const test = require('ava');

const handlers = require('../src/handlers');

test('path with no config (default dirname)', t => {
  const handler = handlers.path();
  t.is(typeof handler, 'function');
  t.is(handler.length, 1);

  t.is(handler(__filename), __filename);

  t.is(handler(path.basename(__filename)), __filename);
});
test('path with config (some dirname)', t => {
  const handler = handlers.path(__dirname);
  t.is(typeof handler, 'function');
  t.is(handler.length, 1);
  t.is(handler(__filename), __filename);

  t.is(handler(path.basename(__filename)), __filename);
});
