const Resolver = require('./src/resolver');
const handlers = require('./src/handlers');

const getDefaultResolver = (dirname, parent) => {
  const _resolver = new Resolver(parent);
  const folder = dirname || process.cwd();
  _resolver.use({
    path: handlers.path(folder),
    file: handlers.file(folder),
    base64: handlers.base64(),
    env: handlers.env(),
    require: handlers.require(folder),
    exec: handlers.exec(folder)
  });
  return _resolver;
};

module.exports = {
  Resolver,
  resolver: Resolver,
  create: Resolver.create,
  handlers,
  getDefaultResolver
};
