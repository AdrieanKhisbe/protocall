const Resolver = require('./src/resolver');
const handlers = require('./src/handlers');

const getDefaultResolver = (dirname, parent) => {
  const _resolver = new Resolver(parent);
  const folder = dirname || process.cwd();
  _resolver.use('path', handlers.path(folder));
  _resolver.use('file', handlers.file(folder));
  _resolver.use('base64', handlers.base64());
  _resolver.use('env', handlers.env());
  _resolver.use('require', handlers.require(folder));
  _resolver.use('exec', handlers.exec(folder));
  return _resolver;
};

module.exports = {
  Resolver,
  resolver: Resolver,
  create: Resolver.create,
  handlers,
  getDefaultResolver
};
