const test = require('ava');

const handlers = require('../src/handlers');

test('exec api', t => {
  const handler = handlers.exec(__dirname);
  t.is(typeof handler, 'function');
  t.is(handler.length, 1);
});
test('exec function', t => {
  const handler = handlers.exec(__dirname);
  t.is(handler('./fixtures#myFunction'), 'myFunction');
});
test('exec module', t => {
  const handler = handlers.exec(__dirname);
  t.is(handler('./fixtures'), 'myModule');
});
test('exec npm', t => {
  const handler = handlers.exec(__dirname);
  // eslint-disable-next-line lodash-fp/use-fp
  const expected = require('lodash').isFunction();
  const actual = handler('lodash#isFunction');
  t.is(typeof actual, typeof expected);
  t.deepEqual(actual, expected);
});

test('exec missing function', t => {
  const handler = handlers.exec(__dirname);
  t.throws(() => handler('./fixtures#notFound'));
});
test('exec missing module', t => {
  const handler = handlers.exec(__dirname);
  t.throws(() => handler('./whatever'));
});
test('exec nonfunction module', t => {
  const handler = handlers.exec(__dirname);
  t.throws(() => handler('../'));
});
