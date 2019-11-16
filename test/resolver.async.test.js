const path = require('path');
const test = require('ava');
const _ = require('lodash/fp');
const protocall = require('..');

function foo(input) {
  return `${input}_foo`;
}

function bar(input, cb) {
  setImmediate(cb.bind(null, null, `${input}_bar`));
}

test('resolver', t => {
  const resolver = protocall.create();
  t.is(typeof resolver, 'object');
  t.is(typeof resolver.use, 'function');
  t.is(typeof resolver.resolve, 'function');
  t.is(typeof resolver.resolveFile, 'function');
});

test('use', t => {
  const resolver = protocall.create();
  resolver.use('foo', foo);

  t.is(typeof resolver._handlers['foo'], 'object');
  t.is(resolver._handlers['foo'].length, 1);
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

  const resolver = protocall.create();
  const unuseA = resolver.use('handlerA', handlerA);
  const unuseB = resolver.use('handlerB', handlerB);
  const unuseC = resolver.use('handlerC', handlerC);

  t.is(typeof unuseA, 'function');
  t.is(typeof unuseB, 'function');
  t.is(typeof unuseC, 'function');

  t.is(typeof resolver._handlers['handlerA'], 'object');
  t.is(typeof resolver._handlers['handlerB'], 'object');
  t.is(typeof resolver._handlers['handlerC'], 'object');

  t.is(resolver._handlers['handlerA'].length, 1);
  t.is(resolver._handlers['handlerB'].length, 1);
  t.is(resolver._handlers['handlerC'].length, 1);

  unuseA();

  t.is(resolver._handlers['handlerA'].length, 0);
  t.is(resolver._handlers['handlerB'].length, 1);
  t.is(resolver._handlers['handlerC'].length, 1);

  unuseC();

  t.is(resolver._handlers['handlerA'].length, 0);
  t.is(resolver._handlers['handlerB'].length, 1);
  t.is(resolver._handlers['handlerC'].length, 0);

  unuseB();

  t.is(resolver._handlers['handlerA'].length, 0);
  t.is(resolver._handlers['handlerB'].length, 0);
  t.is(resolver._handlers['handlerC'].length, 0);
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

  const resolver = protocall.create();
  const unuseA = resolver.use(name, customA);
  const unuseB = resolver.use(name, customB);
  const unuseC = resolver.use(name, customC);

  t.is(typeof unuseA, 'function');
  t.is(typeof unuseB, 'function');
  t.is(typeof unuseC, 'function');

  t.is(typeof resolver._handlers[name], 'object');
  t.is(resolver._handlers[name].length, 3);

  const removedA = unuseA();
  t.is(removedA, customA);
  t.is(`${name}A`, customA.name);
  t.is(resolver._handlers[name].length, 2);

  t.is(unuseA(), undefined);

  const removedB = unuseB();
  t.is(removedB, customB);
  t.is(`${name}B`, customB.name);
  t.is(resolver._handlers[name].length, 1);

  const removedC = unuseC();
  t.is(removedC, customC);
  t.is(`${name}C`, customC.name);
  t.is(resolver._handlers[name].length, 0);
});

test('resolve', async t => {
  const resolver = protocall.create();
  resolver.use('foo', foo);
  resolver.use('bar', bar);

  const source = {foo: 'foo:foo', bar: 'bar:bar', baz: false};
  const actual = await resolver.resolve(source);
  t.is(actual.foo, 'foo_foo');
  t.is(actual.bar, 'bar_bar');
  t.is(actual.baz, false);
  t.not(actual, source);
});

test('resolve with filename', async t => {
  const resolver = protocall.create();
  resolver.use('foo', foo);
  resolver.use('bar', function(data, file, cb) {
    cb(null, file + data);
  });

  const source = {foo: 'foo:foo', bar: 'bar:bar', baz: false};
  const actual = await resolver.resolve(source, __filename);
  t.is(actual.foo, 'foo_foo');
  t.is(actual.bar, `${__filename}bar`);
  t.is(actual.baz, false);
  t.not(actual, source);
});

test('nested resolve', async t => {
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

  const actual = await resolver.resolve(source);
  t.not(actual, source);
  t.is(actual.foo, source.foo);
  t.is(actual.truthy, source.truthy);
  t.is(actual.falsy, source.falsy);
  t.is(actual.numeric, source.numeric);
  t.is(actual.call, 'maybe_foo');
  t.is(actual.i.came, 'in_bar');
  t.is(actual.i.like[0], 'a_foo');
  t.is(actual.i.like[1].wrecking, 'ball_bar');
});

test('async resolve error', async t => {
  const resolver = protocall.create();
  resolver.use('foo', function err(input, cb) {
    cb(new Error('fail'));
  });
  const source = {foo: 'foo:foo', bar: false};
  await t.throwsAsync(() => resolver.resolve(source), 'fail');
});

test('sync resolve uncaught error', async t => {
  const resolver = protocall.create();
  resolver.use('test', function err() {
    throw new Error('fail');
  });
  const source = {foo: 'test:foo', bar: false};
  await t.throwsAsync(() => resolver.resolve(source), 'fail');
});

test('resolveFile', async t => {
  const resolver = protocall.create();
  resolver.use('foo', foo);
  resolver.use('bar', bar);

  const source = require('./fixtures/test');
  const actual = await resolver.resolveFile(path.resolve(__dirname, './fixtures/test'));
  t.is(actual.foo, source.foo);
  t.is(actual.truthy, source.truthy);
  t.is(actual.falsy, source.falsy);
  t.is(actual.numeric, source.numeric);
  t.is(actual.call, 'maybe_foo');
  t.is(actual.i.came, 'in_bar');
  t.is(actual.i.like[0], 'a_foo');
  t.is(actual.i.like[1].wrecking, 'ball_bar');
});

test('resolveFile txt', async t => {
  const resolver = protocall.create();
  resolver.use('foo', foo);
  resolver.use('bar', bar);

  const source = require('./fixtures/test');
  const actual = await resolver.resolveFile(path.resolve(__dirname, './fixtures/test.txt'));

  t.is(actual.foo, source.foo);
  t.is(actual.truthy, source.truthy);
  t.is(actual.falsy, source.falsy);
  t.is(actual.numeric, source.numeric);
  t.is(actual.call, 'maybe_foo');
  t.is(actual.i.came, 'in_bar');
  t.is(actual.i.like[0], 'a_foo');
  t.is(actual.i.like[1].wrecking, 'ball_bar');
});

test('resolveFile error', async t => {
  const resolver = protocall.create();
  await t.throwsAsync(() => resolver.resolveFile('./notfound.txt'), {code: 'ENOENT'});
  await t.throwsAsync(
    () => resolver.resolveFile(path.resolve(__dirname, './fixtures/invalid.txt')),
    'Unexpected token , in JSON at position 1'
  );
});

test('stack', async t => {
  const parent = protocall.create();
  parent.use('foo', foo);
  parent.use('bar', bar);

  const child = protocall.create(parent);

  const source = require('./fixtures/test');
  const actual = await child.resolve(source);
  t.not(actual, source);
  t.is(actual.call, 'maybe_foo');
  t.is(actual.i.came, 'in_bar');
  t.is(actual.i.like[0], 'a_foo');
  t.is(actual.i.like[1].wrecking, 'ball_bar');

  child.use('foo', foo);
  child.use('bar', bar);

  const actual2 = await child.resolve(source);

  t.is(actual2.call, 'maybe_foo_foo');
  t.is(actual2.i.came, 'in_bar_bar');
  t.is(actual2.i.like[0], 'a_foo_foo');
  t.is(actual2.i.like[1].wrecking, 'ball_bar_bar');
});

test('preserve types Buffer', async t => {
  const resolver = protocall.create();
  const data = await resolver.resolve({buffer: Buffer.alloc(0)});
  t.assert(data);
  t.assert(data.buffer);
  t.assert(Buffer.isBuffer(data.buffer));
});

test('preserve types Date', async t => {
  const resolver = protocall.create();
  const data = await resolver.resolve({date: new Date()});
  t.assert(data);
  t.assert(data.date);
  t.assert(_.isDate(data.date));
});

test('preserve types RegExp', async t => {
  const resolver = protocall.create();
  const data = await resolver.resolve({regexp: /./});
  t.assert(data);
  t.assert(data.regexp);
  t.assert(_.isRegExp(data.regexp));
});
