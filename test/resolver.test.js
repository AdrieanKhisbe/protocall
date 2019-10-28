const path = require('path');
const test = require('ava');
const shortstop = require('..');

function foo(input) {
  return `${input}_foo`;
}

function bar(input, cb) {
  setImmediate(cb.bind(null, null, `${input}_bar`));
}

test('resolver', t => {
  const resolver = shortstop.create();
  t.is(typeof resolver, 'object');
  t.is(typeof resolver.use, 'function');
  t.is(typeof resolver.resolve, 'function');
  t.is(typeof resolver.resolveFile, 'function');
});

test('use', t => {
  const resolver = shortstop.create();
  resolver.use('foo', foo);

  t.is(typeof resolver._handlers['foo'], 'object');
  t.is(resolver._handlers['foo'].stack.length, 1);
});

test('unuse', t => {
  function handlerA() {
    // noop
  }

  function handlerB() {
    // noop
  }

  function handlerC() {
    // noop
  }

  const resolver = shortstop.create();
  const unuseA = resolver.use('handlerA', handlerA);
  const unuseB = resolver.use('handlerB', handlerB);
  const unuseC = resolver.use('handlerC', handlerC);

  t.is(typeof unuseA, 'function');
  t.is(typeof unuseB, 'function');
  t.is(typeof unuseC, 'function');

  t.is(typeof resolver._handlers['handlerA'], 'object');
  t.is(typeof resolver._handlers['handlerB'], 'object');
  t.is(typeof resolver._handlers['handlerC'], 'object');

  t.is(resolver._handlers['handlerA'].stack.length, 1);
  t.is(resolver._handlers['handlerB'].stack.length, 1);
  t.is(resolver._handlers['handlerC'].stack.length, 1);

  unuseA();

  t.is(resolver._handlers['handlerA'].stack.length, 0);
  t.is(resolver._handlers['handlerB'].stack.length, 1);
  t.is(resolver._handlers['handlerC'].stack.length, 1);

  unuseC();

  t.is(resolver._handlers['handlerA'].stack.length, 0);
  t.is(resolver._handlers['handlerB'].stack.length, 1);
  t.is(resolver._handlers['handlerC'].stack.length, 0);

  unuseB();

  t.is(resolver._handlers['handlerA'].stack.length, 0);
  t.is(resolver._handlers['handlerB'].stack.length, 0);
  t.is(resolver._handlers['handlerC'].stack.length, 0);
});

test('unuse stack', t => {
  const name = 'custom';
  function customA() {
    // noop
  }

  function customB() {
    // noop
  }

  function customC() {
    // noop
  }

  const resolver = shortstop.create();
  const unuseA = resolver.use(name, customA);
  const unuseB = resolver.use(name, customB);
  const unuseC = resolver.use(name, customC);

  t.is(typeof unuseA, 'function');
  t.is(typeof unuseB, 'function');
  t.is(typeof unuseC, 'function');

  t.is(typeof resolver._handlers[name], 'object');
  t.is(resolver._handlers[name].stack.length, 3);

  const removedA = unuseA();
  t.is(removedA, customA);
  t.is(`${name}A`, customA.name);
  t.is(resolver._handlers[name].stack.length, 2);

  t.is(unuseA(), undefined);

  const removedB = unuseB();
  t.is(removedB, customB);
  t.is(`${name}B`, customB.name);
  t.is(resolver._handlers[name].stack.length, 1);

  const removedC = unuseC();
  t.is(removedC, customC);
  t.is(`${name}C`, customC.name);
  t.is(resolver._handlers[name].stack.length, 0);
});

test.cb('resolve', t => {
  const resolver = shortstop.create();
  resolver.use('foo', foo);
  resolver.use('bar', bar);

  const expected = {foo: 'foo:foo', bar: 'bar:bar', baz: false};
  resolver.resolve(expected, function resolve(err, actual) {
    t.falsy(err);
    t.is(actual.foo, 'foo_foo');
    t.is(actual.bar, 'bar_bar');
    t.is(actual.baz, false);
    t.not(actual, expected);
    t.end();
  });
});

test.cb('resolve with filename', t => {
  const resolver = shortstop.create();
  resolver.use('foo', foo);
  resolver.use('bar', function(data, file, cb) {
    cb(null, file + data);
  });

  const expected = {foo: 'foo:foo', bar: 'bar:bar', baz: false};
  resolver.resolve(expected, __filename, function resolve(err, actual) {
    t.falsy(err);
    t.is(actual.foo, 'foo_foo');
    t.is(actual.bar, `${__filename}bar`);
    t.is(actual.baz, false);
    t.not(actual, expected);
    t.end();
  });
});

test.cb('nested resolve', t => {
  const resolver = shortstop.create();
  resolver.use('foo', foo);
  resolver.use('bar', bar);

  const expected = {
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

  resolver.resolve(expected, function resolve(err, actual) {
    t.falsy(err);
    t.not(actual, expected);
    t.is(actual.foo, expected.foo);
    t.is(actual.truthy, expected.truthy);
    t.is(actual.falsy, expected.falsy);
    t.is(actual.numeric, expected.numeric);
    t.is(actual.call, 'maybe_foo');
    t.is(actual.i.came, 'in_bar');
    t.is(actual.i.like[0], 'a_foo');
    t.is(actual.i.like[1].wrecking, 'ball_bar');
    t.end();
  });
});

test.cb('async resolve error', t => {
  const resolver = shortstop.create();
  resolver.use('foo', function err(input, cb) {
    cb(new Error('fail'));
  });

  const expected = {foo: 'foo:foo', bar: false};
  resolver.resolve(expected, function resolve(err, actual) {
    t.assert(err);
    t.is(err.message, 'fail');
    t.falsy(actual);
    t.end();
  });
});

test.cb('sync resolve uncaught error', t => {
  const resolver = shortstop.create();
  resolver.use('test', function err() {
    throw new Error('fail');
  });

  const expected = {foo: 'test:foo', bar: false};
  resolver.resolve(expected, function resolve(err, actual) {
    t.assert(err);
    t.is(err.message, 'fail');
    t.assert(!actual);
    t.end();
  });
});

test.cb('resolveFile', t => {
  const resolver = shortstop.create();
  resolver.use('foo', foo);
  resolver.use('bar', bar);

  const expected = require('./fixtures/test');
  resolver.resolveFile(path.resolve(__dirname, './fixtures/test'), function resolve(err, actual) {
    t.falsy(err);
    t.is(actual.foo, expected.foo);
    t.is(actual.truthy, expected.truthy);
    t.is(actual.falsy, expected.falsy);
    t.is(actual.numeric, expected.numeric);
    t.is(actual.call, 'maybe_foo');
    t.is(actual.i.came, 'in_bar');
    t.is(actual.i.like[0], 'a_foo');
    t.is(actual.i.like[1].wrecking, 'ball_bar');
    t.end();
  });
});

test.cb('resolveFile txt', t => {
  const resolver = shortstop.create();
  resolver.use('foo', foo);
  resolver.use('bar', bar);

  const expected = require('./fixtures/test');
  resolver.resolveFile(path.resolve(__dirname, './fixtures/test.txt'), function(err, actual) {
    t.falsy(err);
    t.is(actual.foo, expected.foo);
    t.is(actual.truthy, expected.truthy);
    t.is(actual.falsy, expected.falsy);
    t.is(actual.numeric, expected.numeric);
    t.is(actual.call, 'maybe_foo');
    t.is(actual.i.came, 'in_bar');
    t.is(actual.i.like[0], 'a_foo');
    t.is(actual.i.like[1].wrecking, 'ball_bar');
    t.end();
  });
});

test.cb('resolveFile error', t => {
  const resolver = shortstop.create();
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
  const parent = shortstop.create();
  parent.use('foo', foo);
  parent.use('bar', bar);

  const child = shortstop.create(parent);

  const expected = require('./fixtures/test');
  child.resolve(expected, function(err, actual) {
    t.falsy(err);
    t.not(actual, expected);
    t.is(actual.call, 'maybe_foo');
    t.is(actual.i.came, 'in_bar');
    t.is(actual.i.like[0], 'a_foo');
    t.is(actual.i.like[1].wrecking, 'ball_bar');

    child.use('foo', foo);
    child.use('bar', bar);

    child.resolve(expected, function(err, actual) {
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
  const resolver = shortstop.create();
  resolver.resolve({buffer: Buffer.alloc(0)}, function(err, data) {
    t.falsy(err);
    t.assert(data);
    t.assert(data.buffer);
    t.assert(Buffer.isBuffer(data.buffer));
    t.end();
  });
});

test.cb('preserve types Date', t => {
  const resolver = shortstop.create();
  resolver.resolve({date: new Date()}, function(err, data) {
    t.falsy(err);
    t.assert(data);
    t.assert(data.date);
    t.assert(data.date.constructor === Date);
    t.assert(Object.getPrototypeOf(data.date) !== Object.prototype);
    t.end();
  });
});

test.cb('preserve types RegExp', t => {
  const resolver = shortstop.create();
  resolver.resolve({regexp: new RegExp('.')}, function(err, data) {
    t.falsy(err);
    t.assert(data);
    t.assert(data.regexp);
    t.assert(data.regexp.constructor === RegExp);
    t.assert(Object.getPrototypeOf(data.regexp) !== Object.prototype);
    t.end();
  });
});
