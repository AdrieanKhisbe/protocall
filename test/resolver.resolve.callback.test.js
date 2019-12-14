const path = require('path');
const test = require('ava');
const _ = require('lodash/fp');
const yaml = require('js-yaml');
const source = require('./fixtures/test');
const protocall = require('..');

function foo(input) {
  return `${input}_foo`;
}

function bar(input, cb) {
  setImmediate(cb.bind(null, null, `${input}_bar`));
}

test.cb('resolve', t => {
  const resolver = protocall.create();
  resolver.use('foo', foo);
  resolver.use('bar', bar);

  const source = {foo: 'foo:foo', bar: 'bar:bar', baz: false};
  resolver.resolve(source, function resolve(err, actual) {
    t.falsy(err);
    t.is(actual.foo, 'foo_foo');
    t.is(actual.bar, 'bar_bar');
    t.is(actual.baz, false);
    t.not(actual, source);
    t.end();
  });
});

test.cb('resolve with filename', t => {
  const resolver = protocall.create();
  resolver.use('foo', foo);
  resolver.use('bar', function(data, file, cb) {
    cb(null, file + data);
  });

  const source = {foo: 'foo:foo', bar: 'bar:bar', baz: false};
  resolver.resolve(source, __filename, function resolve(err, actual) {
    t.falsy(err);
    t.is(actual.foo, 'foo_foo');
    t.is(actual.bar, `${__filename}bar`);
    t.is(actual.baz, false);
    t.not(actual, source);
    t.end();
  });
});

test.cb('nested resolve', t => {
  const resolver = protocall.create();
  resolver.use('foo', foo);
  resolver.use('bar', bar);

  const source = {
    foo: 'bar',
    truthy: true,
    falsy: false,
    numeric: 10,
    call: 'foo:maybe',
    i: {
      came: 'bar:in',
      like: ['foo:a', {wrecking: 'bar:ball'}]
    }
  };

  resolver.resolve(source, function resolve(err, actual) {
    t.falsy(err);
    t.not(actual, source);
    t.is(actual.foo, source.foo);
    t.is(actual.truthy, source.truthy);
    t.is(actual.falsy, source.falsy);
    t.is(actual.numeric, source.numeric);
    t.is(actual.call, 'maybe_foo');
    t.is(actual.i.came, 'in_bar');
    t.is(actual.i.like[0], 'a_foo');
    t.is(actual.i.like[1].wrecking, 'ball_bar');
    t.end();
  });
});

test.cb('async resolve error', t => {
  const resolver = protocall.create();
  resolver.use('foo', function err(input, cb) {
    cb(new Error('fail'));
  });

  const source = {foo: 'foo:foo', bar: false};
  resolver.resolve(source, function resolve(err, actual) {
    t.assert(err);
    t.is(err.message, 'fail');
    t.falsy(actual);
    t.end();
  });
});

test.cb('sync resolve uncaught error', t => {
  const resolver = protocall.create();
  resolver.use('test', function err() {
    throw new Error('fail');
  });

  const source = {foo: 'test:foo', bar: false};
  resolver.resolve(source, function resolve(err, actual) {
    t.assert(err);
    t.is(err.message, 'fail');
    t.assert(!actual);
    t.end();
  });
});

test.cb('resolveFile', t => {
  const resolver = protocall.create();
  resolver.use('foo', foo);
  resolver.use('bar', bar);

  resolver.resolveFile(path.resolve(__dirname, './fixtures/test'), function resolve(err, actual) {
    t.falsy(err);
    t.is(actual.foo, source.foo);
    t.is(actual.truthy, source.truthy);
    t.is(actual.falsy, source.falsy);
    t.is(actual.numeric, source.numeric);
    t.is(actual.call, 'maybe_foo');
    t.is(actual.i.came, 'in_bar');
    t.is(actual.i.like[0], 'a_foo');
    t.is(actual.i.like[1].wrecking, 'ball_bar');
    t.end();
  });
});

test.cb('resolveFile txt', t => {
  const resolver = protocall.create();
  resolver.use('foo', foo);
  resolver.use('bar', bar);

  resolver.resolveFile(path.resolve(__dirname, './fixtures/test.txt'), function(err, actual) {
    t.falsy(err);
    t.is(actual.foo, source.foo);
    t.is(actual.truthy, source.truthy);
    t.is(actual.falsy, source.falsy);
    t.is(actual.numeric, source.numeric);
    t.is(actual.call, 'maybe_foo');
    t.is(actual.i.came, 'in_bar');
    t.is(actual.i.like[0], 'a_foo');
    t.is(actual.i.like[1].wrecking, 'ball_bar');
    t.end();
  });
});

test.cb('resolveFile custom parser like yaml', t => {
  const resolver = protocall.create();
  resolver.use('foo', foo);
  resolver.use('bar', bar);

  resolver.resolveFile(
    {
      path: path.resolve(__dirname, './fixtures/test.yml'),
      parser: yaml.safeLoad
    },
    (err, actual) => {
      t.not(err);
      t.is(actual.foo, source.foo);
      t.is(actual.truthy, source.truthy);
      t.is(actual.falsy, source.falsy);
      t.is(actual.numeric, source.numeric);
      t.is(actual.call, 'maybe_foo');
      t.is(actual.i.came, 'in_bar');
      t.is(actual.i.like[0], 'a_foo');
      t.is(actual.i.like[1].wrecking, 'ball_bar');
      t.end();
    }
  );
});

test.cb('resolveFile error', t => {
  const resolver = protocall.create();
  resolver.resolveFile('./notfound.txt', function(err, actual) {
    t.assert(err);
    t.assert(!actual);

    resolver.resolveFile(path.resolve(__dirname, './fixtures/invalid.txt'), function(err, actual) {
      t.assert(err);
      t.assert(!actual);
      t.end();
    });
  });
});

test.cb('stack', t => {
  const parent = protocall.create();
  parent.use('foo', foo);
  parent.use('bar', bar);

  const child = protocall.create(parent);

  child.resolve(source, function(err, actual) {
    t.falsy(err);
    t.not(actual, source);
    t.is(actual.call, 'maybe_foo');
    t.is(actual.i.came, 'in_bar');
    t.is(actual.i.like[0], 'a_foo');
    t.is(actual.i.like[1].wrecking, 'ball_bar');

    child.use('foo', foo);
    child.use('bar', bar);

    child.resolve(source, function(err, actual) {
      t.falsy(err);
      t.is(actual.call, 'maybe_foo_foo');
      t.is(actual.i.came, 'in_bar_bar');
      t.is(actual.i.like[0], 'a_foo_foo');
      t.is(actual.i.like[1].wrecking, 'ball_bar_bar');
      t.end();
    });
  });
});

test.cb('preserve types Buffer', t => {
  const resolver = protocall.create();
  resolver.resolve({buffer: Buffer.alloc(0)}, function(err, data) {
    t.falsy(err);
    t.assert(data);
    t.assert(data.buffer);
    t.assert(Buffer.isBuffer(data.buffer));
    t.end();
  });
});

test.cb('preserve types Date', t => {
  const resolver = protocall.create();
  resolver.resolve({date: new Date()}, function(err, data) {
    t.falsy(err);
    t.assert(data);
    t.assert(data.date);
    t.assert(_.isDate(data.date));
    t.end();
  });
});

test.cb('preserve types RegExp', t => {
  const resolver = protocall.create();
  resolver.resolve({regexp: new RegExp('.')}, function(err, data) {
    t.falsy(err);
    t.assert(data);
    t.assert(data.regexp);
    t.assert(_.isRegExp(data.regexp));
    t.end();
  });
});
