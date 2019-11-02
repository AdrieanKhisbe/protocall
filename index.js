const fs = require('fs');
const path = require('path');
const resolver = require('./src/resolver');
const handlers = require('./src/handlers');

function isModule(file) {
  // require.resolve will locate a file without a known extension (e.g. txt)
  // and try to load it as javascript. That won't work for this case.
  const ext = path.extname(file);
  return ext === '' || require.extensions[ext];
}

function create(parent) {
  return Object.create(resolver.create(parent), {
    resolveFile: {
      value: function resolveFile(file, callback) {
        if (isModule(file)) {
          // eslint-disable-next-line import/no-dynamic-require
          this.resolve(require(file), file, callback);
          return;
        }

        fs.readFile(file, 'utf8', (err, data) => {
          if (err) {
            callback(err);
            return;
          }

          try {
            data = JSON.parse(data);
            this.resolve(data, file, callback);
          } catch (_err) {
            callback(_err);
          }
        });
      }
    }
  });
}

const getDefaultResolver = (dirname, parent) => {
  const _resolver = create(parent);
  const folder = dirname || process.cwd();
  _resolver.use('path', handlers.path(folder));
  _resolver.use('file', handlers.file(folder));
  _resolver.use('base64', handlers.base64());
  _resolver.use('env', handlers.env());
  _resolver.use('require', handlers.require(folder));
  _resolver.use('exec', handlers.exec(folder));
  return _resolver;
};

module.exports = {resolver, create, handlers, getDefaultResolver};
