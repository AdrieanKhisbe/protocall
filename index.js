const Resolver = require('./src/resolver');
const handlers = require('./src/handlers');

const getDefaultResolver = options => {
  const {dirname, parent, envOptions, echoOptions} = options || {};
  const folder = dirname || process.cwd();
  return new Resolver(parent, {
    path: handlers.path(folder),
    file: handlers.file(folder),
    base64: handlers.base64(),
    env: handlers.env(envOptions),
    require: handlers.require(folder),
    exec: handlers.exec(folder),
    regexp: handlers.regexp(),
    echo: handlers.echo(echoOptions)
  });
};

const create = (parent, initialHandlers) => new Resolver(parent, initialHandlers);

module.exports = {
  Resolver,
  resolver: Resolver,
  create,
  handlers,
  getDefaultResolver
};
