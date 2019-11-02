const path = require('path');
const test = require('ava');
const protocall = require('..');

test.cb('getDefaultResolver', t => {
  const protocallFolder = path.dirname(__dirname);
  const resolver = protocall.getDefaultResolver(protocallFolder);
  const config = {
    path: 'path:package.json',
    base64: 'base64:cHJvdG8gY2FsbA==',
    env: 'env:NODE_ENV'
  };
  resolver.resolve(config, (err, resolvedConfig) => {
    t.is(resolvedConfig.path, path.resolve(path.join(protocallFolder, 'package.json')));
    t.is(resolvedConfig.env, 'test');
    t.deepEqual(resolvedConfig.base64, Buffer.from('proto call'));

    t.end();
  });
});
