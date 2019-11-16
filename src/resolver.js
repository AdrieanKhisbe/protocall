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

class Handler {
  constructor(protocol, implementation) {
    this.protocol = protocol;
    this.implementation = implementation;
  }
  get regex() {
    return new RegExp(`^${this.protocol}:`);
  }
  predicate(value) {
    return this.regex.test(value);
  }
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
  getProtocol(value) {
    return _.find(protocol => _.startsWith(`${protocol}:`, value), this.supportedProtocols);
  }

  get supportedProtocols() {
    const resolverProtocols = _.keys(this._handlers);
    return _.uniq(resolverProtocols.concat(this.parent ? this.parent.supportedProtocols : []));
  }

  /**
   * Returns the handlers for a given protocol, including parent handlers
   * @param protocol
   * @returns [Handler[]]
   */
  getHandlers(protocol) {
    const handlers = this._handlers[protocol] || [];
    const parentHandlers = this.parent && this.parent.getHandlers(protocol);
    return _.concat(parentHandlers || [], handlers || []);
  }

  /**
   * Register a given handler for the provided protocol.
   * @param protocol the protocol for which the handler should be registered.
   * @param implementation the handler function with the signature `function (input, [fn])`
   * @returns {Function} invoke to remove the registered handler from the stack
   */
  use(protocol, implementation) {
    if (_.isPlainObject(protocol)) {
      return _.pipe(
        _.toPairs,
        _.map(([key, implem]) => [key, this.use(key, implem)]),
        _.fromPairs
      )(protocol);
    }
    if (!_.has(protocol, this._handlers)) this._handlers[protocol] = [];

    const handler = new Handler(protocol, implementation);
    this._handlers[protocol].push(handler);

    let removed = false;
    const protocolHandlers = this._handlers[protocol];

    return function unuse() {
      if (!removed) {
        removed = true;
        const index = protocolHandlers.indexOf(handler);
        return protocolHandlers.splice(index, 1)[0].implementation;
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

    const protocol = this.getProtocol(data);
    if (!protocol) return Promise.resolve(data);

    // Remove protocol prefix
    const content = data.slice(protocol.length + 1);
    const tasks = this.getHandlers(protocol).map(handlerInStack => {
      if (handlerInStack.implementation.length >= 2) return handlerInStack.implementation;
      // If the handler is single argument, expect its return value to be useful,
      // so we wrap it up in continuation-passing style
      return async input => handlerInStack.implementation(input); //.then(a=>console.log(a)||a);
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
