const path = require('path');
const test = require('ava');

const handlers = require('../src/handlers');

const requireHandler = handlers.require(__dirname);

test('require', t => {
  t.is(typeof requireHandler, 'function');
  t.is(requireHandler.length, 1);
});

test('require anonymous', t => {
  t.is(requireHandler('./fixtures'), require('./fixtures'));
});

test('require anonymous (absolute path)', t => {
  t.is(requireHandler(path.resolve(__dirname, './fixtures')), require('./fixtures'));
});

test('require module', t => {
  t.deepEqual(requireHandler('./fixtures/index'), require('./fixtures'));
});

test('require module (absolute path)', t => {
  t.is(requireHandler(path.resolve(__dirname, './fixtures/index')), require('./fixtures'));
});

test('require npm', t => {
  // eslint-disable-next-line lodash-fp/use-fp
  t.is(requireHandler('lodash'), require('lodash'));
});

test('require npm (with some path)', t => {
  t.is(requireHandler('lodash/fp'), require('lodash/fp'));
});

test('require json', t => {
  t.deepEqual(requireHandler('../package'), require('../package'));
});
test('require json (absolute path)', t => {
  t.deepEqual(requireHandler(path.resolve(__dirname, '../package')), require('../package'));
});
