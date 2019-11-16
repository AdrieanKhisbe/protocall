const Resolver = require('./src/resolver');
const handlers = require('./src/handlers');

const getDefaultResolver = (dirname, parent) => {
  const folder = dirname || process.cwd();
  return new Resolver(parent, {
    path: handlers.path(folder),
    file: handlers.file(folder),
    base64: handlers.base64(),
    env: handlers.env(),
    require: handlers.require(folder),
    exec: handlers.exec(folder)
  });
};

module.exports = {
  Resolver,
  resolver: Resolver,
  create: Resolver.create,
  handlers,
  getDefaultResolver
};
