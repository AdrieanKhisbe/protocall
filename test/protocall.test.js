const path = require('path');
const test = require('ava');
const protocall = require('..');

test('getDefaultResolver', async t => {
  const protocallFolder = path.dirname(__dirname);
  const resolver = protocall.getDefaultResolver(protocallFolder);
  const config = {
    path: 'path:package.json',
    base64: 'base64:cHJvdG8gY2FsbA==',
    env: 'env:NODE_ENV',
    glob: 'glob:**/*.js'
  };
  const resolvedConfig = await resolver.resolve(config);
  t.is(resolvedConfig.path, path.resolve(path.join(protocallFolder, 'package.json')));
  t.is(resolvedConfig.env, 'test');
  t.deepEqual(resolvedConfig.base64, Buffer.from('proto call'));
});

test('getDefaultResolver with extra resolver', async t => {
  const protocallFolder = path.dirname(__dirname);
  const resolver = protocall.getDefaultResolver(protocallFolder);
  resolver.use('glob', protocall.handlers.glob());
  const config = {
    path: 'path:package.json',
    base64: 'base64:cHJvdG8gY2FsbA==',
    env: 'env:NODE_ENV',
    glob: 'glob:fixtures/*.txt'
  };
  const resolvedConfig = await resolver.resolve(config);
  t.assert(resolvedConfig.path === path.resolve(path.join(protocallFolder, 'package.json')));
  t.assert(resolvedConfig.env === 'test');
  t.deepEqual(resolvedConfig.base64, Buffer.from('proto call'));
  t.assert(resolvedConfig.glob.length === 2);
});
