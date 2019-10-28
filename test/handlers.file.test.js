const fs = require('fs');
const path = require('path');
const test = require('ava');

const handlers = require('../src/handlers');

test('file no config', t => {
  const handler = handlers.file();
  t.is(typeof handler, 'function');
  t.is(handler.length, 2);
});

test.cb('file absolute path', t => {
  const handler = handlers.file(__dirname);
  t.is(typeof handler, 'function');
  t.is(handler.length, 2);

  const expected = fs.readFileSync(__filename);
  handler(__filename, function(err, actual) {
    t.is(err, null);
    t.deepEqual(actual, expected);
    t.end();
  });
});

test.cb('file with durname, relative path', t => {
  const handler = handlers.file(__dirname);

  const expected = fs.readFileSync(__filename);
  handler(path.relative(__dirname, __filename), function(err, actual) {
    t.is(err, null);
    t.deepEqual(actual, expected);
    t.end();
  });
});

test.cb('file with dirname, absolute path', t => {
  const handler = handlers.file(__dirname);
  const expected = fs.readFileSync(__filename);
  handler(__filename, function(err, actual) {
    t.is(err, null);
    t.deepEqual(actual, expected);
    t.end();
  });
});

test.cb('file', t => {
  // Specified dirname
  const handler = handlers.file(__dirname);
  const expected = fs.readFileSync(__filename);
  handler(path.basename(__filename), function(err, actual) {
    t.is(err, null);
    t.deepEqual(actual, expected);
    t.end();
  });
});

test.cb('file dirname and config', t => {
  // Specified dirname
  const handler = handlers.file(__dirname, {encoding: 'utf8'});
  const expected = fs.readFileSync(__filename);
  handler(__filename, function(err, actual) {
    t.falsy(err);
    t.is(actual, expected.toString('utf8'));
    t.end();
  });
});

test.cb('file dirname and config (no dirname)', t => {
  const handler = handlers.file({encoding: 'utf8'});

  const expected = fs.readFileSync(__filename);
  handler(__filename, function(err, actual) {
    t.falsy(err);
    t.is(actual, expected.toString('utf8'));
    t.end();
  });
});
