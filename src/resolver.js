const fs = require('fs');
const path = require('path');
const _ = require('lodash/fp');
const async = require('async');

function isModule(file) {
  // require.resolve will locate a file without a known extension (e.g. txt)
  // and try to load it as javascript. That won't work for this case.
  const ext = path.extname(file);
  return ext === '' || require.extensions[ext];
}

class Resolver {
  constructor(parent) {
    this.parent = parent;
    this._handlers = {}; // TODO: latern intial resolvers
  }

  /**
   * Locates a handler for the provided value, searching the parent, if necessary
   * @param value the value to match
   * @returns {Object} the handler, if found, otherwise undefined.
   */
  getHandler(value) {
    let resolver = this;
    let handler = undefined;

    while (!handler && resolver && resolver._handlers) {
      Object.keys(resolver._handlers).some(function(protocol) {
        const current = resolver._handlers[protocol];

        // Test the value to see if this is the appropriate handler.
        if (current.predicate(value)) {
          handler = current;
          return true;
        }

        return false;
      });

      // Move to the parent
      resolver = resolver.parent;
    }

    return handler;
  }

  /**
   * Returns the handler stack for a given protocol, including parent handlers
   * @param protocol
   * @returns []
   */
  getStack(protocol) {
    const currentStack = this._handlers[protocol] && this._handlers[protocol].stack;
    const parentStack = this.parent && this.parent.getStack(protocol);
    const hasParent = parentStack && parentStack.length;

    if (currentStack && hasParent) return currentStack.concat(parentStack);

    if (hasParent) return parentStack;

    return currentStack;
  }

  /**
   * Register a given handler for the provided protocol.
   * @param protocol the protocol for which the handler should be registered.
   * @param impl the handler function with the signature `function (input, [fn])`
   * @returns {Function} invoke to remove the registered handler from the stack
   */
  use(protocol, impl) {
    const handlers = this._handlers;
    let handler = handlers[protocol];

    if (!handler) {
      handler = handlers[protocol] = {
        protocol,

        regex: new RegExp(`^${protocol}:`),

        predicate(value) {
          return this.regex.test(value);
        },

        stack: []
      };
    }

    handler.stack.push(impl);
    let removed = false;

    return function unuse() {
      if (!removed) {
        removed = true;
        const idx = handler.stack.indexOf(impl);
        return handler.stack.splice(idx, 1)[0];
      }
      return undefined;
    };
  }

  /**
   * Resolves all the protocols contained in the provided object.
   * @param data The data structure to scan
   * @param callback the callback to invoke when processing is complete with the signature `function (err, data)`
   */
  _resolve(data, filename) {
    if (_.isArray(data))
      return async.parallel(data.map(val => this.resolve.bind(this, val, filename)));

    if (_.isPlainObject(data))
      return async.parallel(_.mapValues(value => this.resolve.bind(this, value, filename), data));

    if (!_.isString(data))
      // Non-protocol-able value
      return Promise.resolve(data);

    const handler = this.getHandler(data);
    if (!handler) return Promise.resolve(data);

    // Remove protocol prefix
    const content = data.slice(handler.protocol.length + 1);

    const tasks = this.getStack(handler.protocol).map(handlerInStack => {
      if (handlerInStack.length >= 2) return handlerInStack;
      // If the handler is single argument, expect its return value to be useful,
      // so we wrap it up in continuation-passing style
      return async input => handlerInStack(input);
    });

    const bootsrapTask =
      tasks[0].length == 2 // does Initial Task Needs Filename
        ? cb => cb(null, content)
        : cb => cb(null, content, filename);
    return async.waterfall([bootsrapTask, ...tasks]);
  }

  /**
   * Resolves all the protocols contained in the provided object.
   * @param data The data structure to scan
   * @param callback the callback to invoke when processing is complete with the signature `function (err, data)`
   */
  resolve(data, filename, callback) {
    if (!callback && _.isFunction(filename)) {
      callback = filename;
      filename = null;
    }

    const result = this._resolve(data, filename);
    if (!callback) return result;
    return result.then(res => callback(null, res)).catch(callback);
  }

  resolveFile(file, callback) {
    if (isModule(file))
      // eslint-disable-next-line import/no-dynamic-require
      return this.resolve(require(file), file, callback);

    const result = new Promise((resolve, reject) =>
      fs.readFile(file, 'utf8', (err, data) => {
        if (err) return reject(err);
        try {
          return resolve(JSON.parse(data));
        } catch (parsingError) {
          reject(parsingError);
        }
      })
    ).then(fileContent => this.resolve(fileContent, file));

    if (!callback) return result;
    return result.then(res => callback(null, res)).catch(callback);
  }
}
module.exports = Resolver;
module.exports.create = parent => new Resolver(parent);
