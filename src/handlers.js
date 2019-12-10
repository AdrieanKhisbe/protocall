const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const _ = require('lodash/fp');
const globby = require('globby');
const callsites = require('callsites');

const getCallerFolder = () => {
  const file = callsites()[2].getFileName(); // note: 2 and not 0 since wrapped in function
  return path.dirname(file);
};

/**
 * Creates the protocol handler for the `path:` protocol
 * @param basedir
 * @returns {Function}
 */
function _path(basedir) {
  const baseDirectory = basedir || getCallerFolder();
  return function pathHandler(file) {
    // Absolute path already, so just return it.
    if (path.resolve(file) === file) return file;

    return path.resolve(baseDirectory, ...file.split('/'));
  };
}

/**
 * Creates the protocol handler for the `file:` protocol
 * @param basedir
 * @param options
 * @returns {Function}
 */
function file(basedir, options) {
  if (_.isObject(basedir)) {
    options = basedir;
    basedir = undefined;
  }

  const pathHandler = _path(basedir);
  options = options || {encoding: null, flag: 'r'};

  return function fileHandler(file, cb) {
    fs.readFile(pathHandler(file), options, cb);
  };
}

/**
 * Creates the protocol handler for the `buffer:` protocol
 * @returns {Function}
 */
function base64() {
  return function base64Handler(value) {
    return Buffer.from(value, 'base64');
  };
}

function toRegexp(value, params) {
  const match = value.match(/^\/(.*)\/([miguys]+)?$/);
  if (!match) return new RegExp(value, params);

  const [, pattern, flags] = match;
  return new RegExp(pattern, flags || params);
}

function regexp(defaultFlags) {
  return function regexpHandler(value) {
    return toRegexp(value, defaultFlags);
  };
}

const DIGEST_ALGORITHMS = ['md5', 'md4', 'sha1', 'sha224', 'sha256', 'sha384', 'sha512'];

const DEFAULT_FILTERS = {
  d(value) {
    return parseInt(value, 10);
  },
  b(value) {
    return !['', 'false', '0', undefined].includes(value);
  },
  '!b'(value) {
    return ['', 'false', '0', undefined].includes(value);
  },
  r(value, params) {
    return toRegexp(value, params);
  },
  from(value, encoding) {
    if (!encoding) throw new Error('Missing configuration for the from filter');
    if (['b64', 'base64'].includes(encoding)) return Buffer.from(value, 'base64').toString('utf-8');
    if (encoding === 'hex') return Buffer.from(value, 'hex').toString('utf-8');
    throw new Error(`Unkown format specifed for from filter: '${encoding}'`);
  },
  to(value, encodingOrAlgo, digestEncoding = 'hex') {
    if (!encodingOrAlgo) throw new Error('Missing configuration for the to filter');
    if (['b64', 'base64'].includes(encodingOrAlgo)) return Buffer.from(value).toString('base64');
    if (encodingOrAlgo === 'hex') return Buffer.from(value).toString('hex');
    if (DIGEST_ALGORITHMS.includes(encodingOrAlgo))
      return crypto
        .createHash(encodingOrAlgo)
        .update(value)
        .digest(digestEncoding);

    throw new Error(`Unkown format specifed for to filter: '${encodingOrAlgo}'`);
  }
};

const shouldMerge = ({merge, replace}) => {
  if (merge) return true;
  if (replace) return false;
  if (merge === false && replace === undefined) return false;
  return true;
};

/**
 * Creates the protocol handler for the `env:` protocol
 * @returns {Function}
 */
function env(options = {}) {
  const filters = options.filters
    ? shouldMerge(options)
      ? Object.assign({}, DEFAULT_FILTERS, options.filters)
      : options.filters
    : DEFAULT_FILTERS;

  const env = options.env ? options.env : process.env;

  const getValue = (key, defaultOverride) => {
    const rawValue = env[key];
    if (rawValue !== undefined) return rawValue;
    if (defaultOverride) return defaultOverride;
    if (options.defaults) return options.defaults[key];
  };

  return function envHandler(value) {
    const match = value.match(/^([\w_]+)(?::-(.+?))?(?:[|](.+))?$/);
    if (!match) throw new Error(`Invalid env protocol provided: '${value}'`);
    const [, envVariableName, defaultValue, filter] = match;
    // TODO: later, could add multiple filters

    const resolvedValue = getValue(envVariableName, defaultValue);
    if (!filter) return resolvedValue;

    const [filterName, ...filterParams] = filter.trim().split(':');
    const filterHandler = filters[filterName];
    if (!filterHandler)
      throw new Error(`Invalid env protocol provided, unknown filter: '${value}'`);
    return filterHandler(resolvedValue, ...filterParams);
  };
}

/**
 * Creates the protocol handler for the `echo:` protocol
 * @returns {Function}
 */
function echo(options = {}) {
  const filters = options.filters
    ? shouldMerge(options)
      ? Object.assign({}, DEFAULT_FILTERS, options.filters)
      : options.filters
    : DEFAULT_FILTERS;

  return function echoHandler(value) {
    const [, echoString, filter] = value.match(/^(.*?)(?:[|](.+))?$/);
    if (!echoString || echoString.endsWith('|'))
      throw new Error(`Invalid echo protocol provided: '${value}'`);
    // TODO: later, could add multiple filters
    if (!filter) return echoString;

    const [filterName, ...filterParams] = filter.trim().split(':');
    const filterHandler = filters[filterName];
    if (!filterHandler)
      throw new Error(`Invalid echo protocol provided, unknown filter: '${value}'`);
    return filterHandler(echoString, ...filterParams);
  };
}

/**
 * Creates the protocol handler for the `require:` protocol
 * @param basedir
 * @returns {Function}
 */
function _require(basedir) {
  const resolvePath = _path(basedir);
  return function requireHandler(value) {
    const _module = /^\.{0,2}\//.test(value) ? resolvePath(value) : value;
    // resolve if start with ../ ./ or /
    // @see http://nodejs.org/api/modules.html#modules_file_modules
    // NOTE: Technically, paths with a leading '/' don't need to be resolved, but leaving for consistency.

    // eslint-disable-next-line import/no-dynamic-require
    return require(_module);
  };
}

/**
 * Creates the protocol handler for the `exec:` protocol
 * @param basedir
 * @returns {Function}
 */
function exec(basedir) {
  const require = _require(basedir);
  return function execHandler(value) {
    const [modulePath, propertyName] = value.split('#');
    // eslint-disable-next-line import/no-dynamic-require
    const _module = require(modulePath);
    const method = propertyName ? _module[propertyName] : _module;

    if (_.isFunction(method)) return method();

    throw new Error(`exec: unable to locate function in ${value}`);
  };
}

/**
 * Creates the protocol handler for the `glob:` protocol
 * @param options https://github.com/mrmlnc/fast-glob#options-1
 * @returns {Function}
 */
function glob(options) {
  if (_.isString(options)) {
    options = {cwd: options};
  }

  options = options || {};
  options.cwd = options.cwd || getCallerFolder();

  const resolvePath = _path(options.cwd);
  return function globHandler(value) {
    return globby(value, options).then(paths => paths.map(resolvePath));
  };
}

module.exports = {path: _path, file, base64, regexp, env, echo, require: _require, exec, glob};
