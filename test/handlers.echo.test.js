const test = require('ava');

const handlers = require('../src/handlers');

const echoHandler = handlers.echo();

test('echo api', t => {
  t.is(typeof echoHandler, 'function');
  t.is(echoHandler.length, 1);
});

test('echo raw', t => {
  t.is(echoHandler('test'), 'test');
});

test('echo with invalid value', t => {
  t.throws(() => echoHandler('coucou|a'), /Invalid echo protocol provided, unknown filter/);
  t.throws(() => echoHandler('|no-string'), /Invalid echo protocol provided/);
  t.throws(() => echoHandler('oups trailing pipe|'), /Invalid echo protocol provided/);
});

test('echo as number', t => {
  t.is(echoHandler('12|d'), 12);
});

test('echo as number but string', t => {
  t.assert(isNaN(echoHandler('douze|d')));
});

test('echo as booolean (some string)', t => {
  t.is(echoHandler('whatever|b'), true);
});

test('echo as boolean (true string)', t => {
  t.is(echoHandler('true|b'), true);
});

test('echo as boolean (false string)', t => {
  t.is(echoHandler('false|b'), false);
});

test('echo as boolean (false number)', t => {
  t.is(echoHandler('0|b'), false);
});

test('echo as booolean negation (some string)', t => {
  t.is(echoHandler('whatever|!b'), false);
});

test('echo as boolean negation (true string)', t => {
  t.is(echoHandler('true|!b'), false);
});

test('echo as boolean negation (false string)', t => {
  t.is(echoHandler('false|!b'), true);
});

test('echo as boolean negation (false number)', t => {
  t.is(echoHandler('0|!b'), true);
});

test('echo as simple regex', t => {
  t.deepEqual(echoHandler('.*|r'), /.*/);
});

test('echo as complex regex', t => {
  t.deepEqual(echoHandler('/.*/g|r'), /.*/g);
});

test('echo pipe to from hex', t => {
  t.deepEqual(echoHandler('636f75636f75757575|from:hex'), 'coucouuuu');
});

test('echo pipe to from bad config', t => {
  t.throws(() => echoHandler('coucou|from'), /Missing configuration for the from filter/);
  t.throws(
    () => echoHandler('coucou|from:something-unknown'),
    /Unkown format specifed for from filter: 'something-unknown'/
  );
});

test('echo pipe to from base64', t => {
  t.deepEqual(echoHandler('YmlnIHNlY3JldA==|from:b64'), 'big secret');
  t.deepEqual(echoHandler('YmlnIHNlY3JldA==|from:base64'), 'big secret');
});

test('echo pipe to to hex', t => {
  t.deepEqual(echoHandler('coucouuuu|to:hex'), '636f75636f75757575');
});

test('echo pipe to to base64', t => {
  t.deepEqual(echoHandler('big secret|to:b64'), 'YmlnIHNlY3JldA==');
  t.deepEqual(echoHandler('big secret|to:base64'), 'YmlnIHNlY3JldA==');
});

test('echo pipe to to digest algorithmes', t => {
  t.deepEqual(echoHandler('big secret|to:md5'), '764da679935cda6e5f6552f37ef2cac3');
  t.deepEqual(echoHandler('big secret|to:md4'), '20c9476c950e98519c2760194767b01e');
  t.deepEqual(echoHandler('big secret|to:sha1'), '2151580e68418a2234c5615c4d70a92eb5063710');
  t.deepEqual(
    echoHandler('big secret|to:sha256'),
    'd9deadfb84f5aa7284724cb8ba1d23e494246904be3c0e6daca4a1c3b3081972'
  );
  t.deepEqual(
    echoHandler('big secret|to:sha512'),
    'f2238763da9ce209342fdd48e426359bd03bc603495564859ece8f92a8702e76fe3c855dcaf103e26f02383e3f9cc17fef16ea9b0544a1240437b27c7c2e83ae'
  );
});

test('echo pipe to to bad config', t => {
  t.throws(() => echoHandler('coucou|to'), /Missing configuration for the to filter/);
  t.throws(
    () => echoHandler('coucou|to:something-unknown'),
    /Unkown format specifed for to filter: 'something-unknown'/
  );
});
