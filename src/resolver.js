const thing = require('util');
const async = require('async');


exports.create = function create(parent) {

    return {

        parent: parent,


        _handlers: Object.create(null),


        /**
         * Locates a handler for the provided value, searching the parent, if necessary
         * @param value the value to match
         * @returns {Object} the handler, if found, otherwise undefined.
         */
        getHandler: function getHandler(value) {
            let resolver = this;
            let handler = undefined;

            while (!handler && resolver && resolver._handlers) {

                Object.keys(resolver._handlers).some(function (protocol) {
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
        },


        /**
         * Returns the handler stack for a given protocol, including parent handlers
         * @param protocol
         * @returns []
         */
        getStack: function getStack(protocol) {
            const currentStack = this._handlers[protocol] && this._handlers[protocol].stack;
            const parentStack = this.parent && this.parent.getStack(protocol);
            const hasParent = parentStack && parentStack.length;

            if (currentStack && hasParent) {
                return currentStack.concat(parentStack);
            }

            if (hasParent) {
                return parentStack;
            }

            return currentStack;
        },


        /**
         * Register a given handler for the provided protocol.
         * @param protocol the protocol for which the handler should be registered.
         * @param impl the handler function with the signature `function (input, [fn])`
         * @returns {Function} invoke to remove the registered handler from the stack
         */
        use: function use(protocol, impl) {
            const handlers = this._handlers;
            let handler = handlers[protocol];

            if (!handler) {
                handler = handlers[protocol] = {

                    protocol: protocol,

                    regex: new RegExp('^' + protocol + ':'),

                    predicate: function (value) {
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
        },


        /**
         * Resolves all the protocols contained in the provided object.
         * @param data The data structure to scan
         * @param callback the callback to invoke when processing is complete with the signature `function (err, data)`
         */
        resolve: function resolve(data, filename, callback) {
            let tasks, handler;

            if (!callback) {
                callback = filename;
                filename = null;
            }

            if (thing.isArray(data) || (thing.isObject(data) && Object.getPrototypeOf(data) === Object.prototype)) {

                if (thing.isArray(data)) {

                    tasks = data.map((val) => resolve.bind(this, val, filename));

                } else {
                    tasks = {};
                    Object.keys(data).forEach((key) => {
                        tasks[key] = resolve.bind(this, data[key], filename);
                    });
                }

                async.parallel(tasks, function (err, data) {
                    err ? callback(err) : callback(null, data);
                });

            } else if (thing.isString(data)) {

                tasks = [];

                handler = this.getHandler(data);
                if (!handler) {
                    setImmediate(callback.bind(null, null, data));
                    return;
                }

                // Remove protocol prefix
                data = data.slice(handler.protocol.length + 1);

                tasks = this.getStack(handler.protocol).map(function (handler) {
                    if (handler.length < 2) {
                        // If the handler is single argument, expect its return value to be useful,
                        // so we wrap it up in continuation-passing style
                        return function wrapper(input, done) {
                            try {
                                return done(null, handler(input));
                            } catch (err) {
                                return done(err);
                            }
                        };
                    }
                    return handler;
                });

                tasks.unshift(tasks[0].length == 2 ? function init(done) {
                    done(null, data);
                } : function init(done) {
                    done(null, data, filename);
                });

                // Waterfall will *always* resolve asynchronously
                async.waterfall(tasks, callback);

            } else {

                // Non-protocol-able value
                callback(null, data);

            }

        }

    };

};
