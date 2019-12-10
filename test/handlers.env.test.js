const test = require('ava');

const handlers = require('../src/handlers');

const envHandler = handlers.env();

test('env api', t => {
  t.is(typeof envHandler, 'function');
  t.is(envHandler.length, 1);
});

test('env raw', t => {
  process.env.TEST_SAMPLE = '8000';
  t.is(envHandler('TEST_SAMPLE'), '8000');
});

test('env with invalid value', t => {
  process.env.TEST_SAMPLE = '8000';
  t.throws(() => envHandler('TEST_SAMPLE:-'), /Invalid env protocol provided/);
  t.throws(() => envHandler('TEST_SAMPLE|'), /Invalid env protocol provided/);
  t.throws(() => envHandler('TEST-SAMPLE'), /Invalid env protocol provided/);
  t.throws(() => envHandler('TEST_SAMPLE:-'), /Invalid env protocol provided/);
  t.throws(() => envHandler('TEST_SAMPLE|kikou'), /Invalid env protocol provided, unknown filter/);
});

test('env as number', t => {
  process.env.TEST_SAMPLE_NUMBER = '8000';
  t.is(envHandler('TEST_SAMPLE_NUMBER|d'), 8000);
});

test('env as number but not empty', t => {
  process.env.TEST_SAMPLE_NAN = '';
  t.assert(isNaN(envHandler('TEST_SAMPLE_NAN|d')));
});

test('env as number but string', t => {
  process.env.TEST_SAMPLE_NAN_STR = 'not a number';
  t.assert(isNaN(envHandler('TEST_SAMPLE_NAN_STR|d')));
});

test('env as booolean (some string)', t => {
  process.env.TEST_SAMPLE_TO_BOOL = '8000';
  t.is(envHandler('TEST_SAMPLE_TO_BOOL|b'), true);
});

test('env as boolean (true string)', t => {
  process.env.TEST_SAMPLE_TO_BOOL_FROM_STR = 'true';
  t.is(envHandler('TEST_SAMPLE_TO_BOOL_FROM_STR|b'), true);
});

test('env as boolean (false string)', t => {
  process.env.TEST_SAMPLE_TO_BOOL_FROM_STR_FALSE = 'false';
  t.is(envHandler('TEST_SAMPLE_TO_BOOL_FROM_STR_FALSE|b'), false);
});

test('env as boolean (false number)', t => {
  process.env.TEST_SAMPLE_TO_BOOL_FROM_INT_FALSE = '0';
  t.is(envHandler('TEST_SAMPLE_TO_BOOL_FROM_INT_FALSE|b'), false);
});

test('env as boolean from empty', t => {
  t.is(envHandler('TEST_SAMPLE_TO_BOOL_FROM_UNDEFINED_VARENV|b'), false);
});

test('env as booolean negation (some string)', t => {
  process.env.TEST_SAMPLE_TO_NOT_BOOL = '8000';
  t.is(envHandler('TEST_SAMPLE_TO_NOT_BOOL|!b'), false);
});

test('env as boolean negation (true string)', t => {
  process.env.TEST_SAMPLE_TO_NOT_BOOL_FROM_STR = 'true';
  t.is(envHandler('TEST_SAMPLE_TO_NOT_BOOL_FROM_STR|!b'), false);
});

test('env as boolean negation (false string)', t => {
  process.env.TEST_SAMPLE_TO_NOT_BOOL_FROM_STR_FALSE = 'false';
  t.is(envHandler('TEST_SAMPLE_TO_NOT_BOOL_FROM_STR_FALSE|!b'), true);
});

test('env as boolean negation (false number)', t => {
  process.env.TEST_SAMPLE_TO_NOT_BOOL_FROM_INT_FALSE = '0';
  t.is(envHandler('TEST_SAMPLE_TO_NOT_BOOL_FROM_INT_FALSE|!b'), true);
});

test('env as boolean negation from empty', t => {
  t.is(envHandler('TEST_SAMPLE_TO_NOT_BOOL_FROM_UNDEFINED_VARENV|!b'), true);
});

test('env as simple regex', t => {
  process.env.TEST_SAMPLE_SIMPLE_REGEX = '.*';
  t.deepEqual(envHandler('TEST_SAMPLE_SIMPLE_REGEX|r'), /.*/);
});

test('env as simple regex + filter with default flags', t => {
  process.env.TEST_SAMPLE_SIMPLE_REGEX = '.*';
  t.deepEqual(envHandler('TEST_SAMPLE_SIMPLE_REGEX|r:im'), /.*/im);
});

test('env as complex regex', t => {
  process.env.TEST_SAMPLE_SIMPLE_REGEX = '/.*/g';
  t.deepEqual(envHandler('TEST_SAMPLE_SIMPLE_REGEX|r'), /.*/g);
});

test('env as complex regex + filter with default flags', t => {
  process.env.TEST_SAMPLE_SIMPLE_REGEX = '/.*/g';
  t.deepEqual(envHandler('TEST_SAMPLE_SIMPLE_REGEX|r:i'), /.*/g);
});

test('env as regex with flags', t => {
  process.env.TEST_SAMPLE_STRING_DEFAULT = 'something defined';
  t.is(envHandler('TEST_SAMPLE_STRING_DEFAULT:-some default'), 'something defined');
  t.is(envHandler('TEST_SAMPLE_DEFAULT_FROM_UNDEFINED_VARENV:-some default'), 'some default');
});

test('env with default and filter', t => {
  t.is(envHandler('TEST_SAMPLE_DEFAULT_TO_BOOL_FROM_UNDEFINED_VARENV:-true|b'), true);
});

// note: partial adaption from test of .env.test to ensure wiring is ok
test('env pipe to from hex', t => {
  process.env.HEX = '636f75636f75757575';
  t.is(envHandler('HEX|from:hex'), 'coucouuuu');
});

test('env pipe to from base64', t => {
  process.env.B64 = 'YmlnIHNlY3JldA==';
  t.is(envHandler('B64|from:b64'), 'big secret');
  t.is(envHandler('B64|from:base64'), 'big secret');
});

test('env pipe to to hex, b64 or digest algorithmes', t => {
  process.env.SOME_SECRET = 'big secret';
  t.is(envHandler('SOME_SECRET|to:hex'), '62696720736563726574');
  t.is(envHandler('SOME_SECRET|to:b64'), 'YmlnIHNlY3JldA==');
  t.is(envHandler('SOME_SECRET|to:base64'), 'YmlnIHNlY3JldA==');
  t.is(envHandler('SOME_SECRET|to:md5'), '764da679935cda6e5f6552f37ef2cac3');
  t.is(envHandler('SOME_SECRET|to:md4'), '20c9476c950e98519c2760194767b01e');
  t.is(envHandler('SOME_SECRET|to:sha1'), '2151580e68418a2234c5615c4d70a92eb5063710');
  t.is(
    envHandler('SOME_SECRET|to:sha256'),
    'd9deadfb84f5aa7284724cb8ba1d23e494246904be3c0e6daca4a1c3b3081972'
  );
  t.is(
    envHandler('SOME_SECRET|to:sha512'),
    'f2238763da9ce209342fdd48e426359bd03bc603495564859ece8f92a8702e76fe3c855dcaf103e26f02383e3f9cc17fef16ea9b0544a1240437b27c7c2e83ae'
  );
});

test('env configuration with custom filters', t => {
  process.env.coucou = 'coucou';
  t.is(handlers.env({})('coucou|b'), true);
  t.is(handlers.env({}, true)('coucou|b'), true);
  t.is(handlers.env({}, 'merge')('coucou|b'), true);
  t.throws(() => handlers.env({}, false)('coucou|b'), /Invalid env protocol provided/);
  t.throws(() => handlers.env({}, 'replace')('coucou|b'), /Invalid env protocol provided/);
  t.throws(() => handlers.env({}, 'whataver')('coucou|b'), /Invalid env protocol provided/);
});
