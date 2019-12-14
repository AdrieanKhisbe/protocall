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
  t.is(echoHandler('636f75636f75757575|from:hex'), 'coucouuuu');
});

test('echo pipe to from bad config', t => {
  t.throws(() => echoHandler('coucou|from'), /Missing configuration for the from filter/);
  t.throws(
    () => echoHandler('coucou|from:something-unknown'),
    /Unkown format specifed for from filter: 'something-unknown'/
  );
});

test('echo pipe to from base64', t => {
  t.is(echoHandler('YmlnIHNlY3JldA==|from:b64'), 'big secret');
  t.is(echoHandler('YmlnIHNlY3JldA==|from:base64'), 'big secret');
});

test('echo pipe to to hex', t => {
  t.is(echoHandler('coucouuuu|to:hex'), '636f75636f75757575');
});

test('echo pipe to to base64', t => {
  t.is(echoHandler('big secret|to:b64'), 'YmlnIHNlY3JldA==');
  t.is(echoHandler('big secret|to:base64'), 'YmlnIHNlY3JldA==');
});

test('echo pipe to to digest algorithmes to hex (implicitely and explicitely)', t => {
  t.is(echoHandler('big secret|to:md5'), '764da679935cda6e5f6552f37ef2cac3');
  t.is(echoHandler('big secret|to:md5:hex'), '764da679935cda6e5f6552f37ef2cac3');
  t.is(echoHandler('big secret|to:md4'), '20c9476c950e98519c2760194767b01e');
  t.is(echoHandler('big secret|to:md4:hex'), '20c9476c950e98519c2760194767b01e');
  t.is(echoHandler('big secret|to:sha1'), '2151580e68418a2234c5615c4d70a92eb5063710');
  t.is(echoHandler('big secret|to:sha1:hex'), '2151580e68418a2234c5615c4d70a92eb5063710');
  t.is(
    echoHandler('big secret|to:sha256'), // |to:sha256:hex implicitely tested
    'd9deadfb84f5aa7284724cb8ba1d23e494246904be3c0e6daca4a1c3b3081972'
  );
  t.is(
    echoHandler('big secret|to:sha512'),
    'f2238763da9ce209342fdd48e426359bd03bc603495564859ece8f92a8702e76fe3c855dcaf103e26f02383e3f9cc17fef16ea9b0544a1240437b27c7c2e83ae'
  );
});

test('echo pipe to to digest algorithmes to base64', t => {
  t.is(echoHandler('big secret|to:md5:base64'), 'dk2meZNc2m5fZVLzfvLKww==');
  t.is(echoHandler('big secret|to:md4:base64'), 'IMlHbJUOmFGcJ2AZR2ewHg==');
  t.is(echoHandler('big secret|to:sha1:base64'), 'IVFYDmhBiiI0xWFcTXCpLrUGNxA=');
  t.is(echoHandler('big secret|to:sha256:base64'), '2d6t+4T1qnKEcky4uh0j5JQkaQS+PA5trKShw7MIGXI=');
  t.is(
    echoHandler('big secret|to:sha512:base64'),
    '8iOHY9qc4gk0L91I5CY1m9A7xgNJVWSFns6PkqhwLnb+PIVdyvED4m8COD4/nMF/7xbqmwVEoSQEN7J8fC6Drg=='
  );
});

test('echo pipe to to bad config', t => {
  t.throws(() => echoHandler('coucou|to'), /Missing configuration for the to filter/);
  t.throws(
    () => echoHandler('coucou|to:something-unknown'),
    /Unkown format specifed for to filter: 'something-unknown'/
  );
});

test('echo with custom filters overrides', t => {
  const echoHandler = handlers.echo({filters: {lol: () => 'lol', r: null, d: undefined}});

  t.is(echoHandler('whatever you wont listen|lol'), 'lol');
  t.throws(
    () => echoHandler('coucou|r'),
    /Invalid echo protocol provided/,
    'Does not seems like r filter was disabled'
  );
  t.throws(
    () => echoHandler('coucou|d'),
    /Invalid echo protocol provided/,
    'Does not seems like d filter was disabled'
  );
});

test('echo with custom filters replacement', t => {
  const echoHandler = handlers.echo({
    filters: {lol: () => 'lol', r: null, d: undefined},
    replace: true
  });

  t.is(echoHandler('whatever you wont listen|lol'), 'lol');
  t.throws(() => echoHandler('coucou|b'), /Invalid echo protocol provided/);
  t.throws(() => echoHandler('coucou|r'), /Invalid echo protocol provided/);
  t.throws(() => echoHandler('coucou|d'), /Invalid echo protocol provided/);
});

test('echo configuration with custom filters', t => {
  t.is(handlers.echo()('coucou|b'), true);
  t.is(handlers.echo({})('coucou|b'), true);
  t.is(handlers.echo({filters: {}})('coucou|b'), true);
  t.is(handlers.echo({filters: {}, merge: true})('coucou|b'), true);
  t.is(handlers.echo({filters: {}, replace: false})('coucou|b'), true);
  t.is(handlers.echo({filters: {}, merge: false, replace: false})('coucou|b'), true);
  t.throws(
    () => handlers.echo({filters: {}, merge: false})('coucou|b'),
    /Invalid echo protocol provided/
  );
  t.throws(
    () => handlers.echo({filters: {}, replace: true}, 'replace')('coucou|b'),
    /Invalid echo protocol provided/
  );
});
