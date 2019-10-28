const test = require('ava');

const handlers = require('../src/handlers');

test('base64', t => {
  const handler = handlers.base64();
  t.is(typeof handler, 'function');
  t.is(handler.length, 1);
  t.deepEqual(
    handler(Buffer.from('Hello, world!').toString('base64')),
    Buffer.from('Hello, world!')
  );
});
