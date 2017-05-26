(function () {
    'use strict';

    const Connection = require('./connection');
    const Services = require('./services');
    const Utils = require('./utils');
    const Const = require('./const');

    // Defaults
    const
        DEFAULT_HOST = '127.0.0.1',
        DEFAULT_PORT = 3050;

    if (typeof(setImmediate) === 'undefined') {
        global.setImmediate = function (cb) {
            process.nextTick(cb);
        };
    }

    module.exports = {
        // Letting external access to transaction isolation options
        ISOLATION_READ_UNCOMMITTED: Const.ISOLATION_READ_UNCOMMITTED,
        ISOLATION_READ_COMMITED: Const.ISOLATION_READ_COMMITED,
        ISOLATION_REPEATABLE_READ: Const.ISOLATION_REPEATABLE_READ,
        ISOLATION_SERIALIZABLE: Const.ISOLATION_SERIALIZABLE,
        ISOLATION_READ_COMMITED_READ_ONLY: Const.ISOLATION_READ_COMMITED_READ_ONLY,
        ISOLATION_READ: Const.ISOLATION_READ,
        ISOLATION_WRITE: Const.ISOLATION_WRITE,

        /**
         * Escape value
         * @param {Object} value
         * @return {String}
         */
        escape: Utils.escape,

        /**
         * Attach a database
         * @param options
         * @param callback
         */
        attach,

        /**
         * Create a database
         * @param options
         * @param callback
         */
        create,

        /**
         * Attach or create database
         * @param options
         * @param callback
         */
        attachOrCreate
    };

    /**
     * Attach to a database
     * @param options
     * @param callback
     */
    function attach(options, callback) {
        const host = options.host || DEFAULT_HOST;
        const port = options.port || DEFAULT_PORT;
        const ConnectionClass = options.manager ? Services.ServiceConnection : Connection;

        const cnx = new ConnectionClass(host, port, (err) => {
            if (err) {
                return Utils.doError(err, callback);
            }

            cnx.connect(options.database || options.filename, (err) => {
                if (err) {
                    return Utils.doError(err, callback);
                }

                cnx.attach(options, callback);
            });
        }, options);
    }

    /**
     * Create a database
     * @param options
     * @param callback
     */
    function create(options, callback) {
        const host = options.host || DEFAULT_HOST;
        const port = options.port || DEFAULT_PORT;

        const cnx = new Connection(host, port, (err) => {
            if (err) {
                return Utils.doError(err, callback);
            }

            cnx.connect(options.database || options.filename, (err) => {
                if (err) {
                    if (cnx.db) {
                        cnx.db.emit('error', err);
                    }
                    return Utils.doError(err, callback);
                }

                cnx.createDatabase(options, callback);
            });
        }, options);
    }

    /**
     * Attach or create database
     * @param options
     * @param callback
     */
    function attachOrCreate(options, callback) {
        const host = options.host || DEFAULT_HOST;
        const port = options.port || DEFAULT_PORT;

        const cnx = new Connection(host, port, (err) => {
            if (err) {
                return Utils.doError({error: err, message: 'Connect error'}, callback);
            }

            cnx.connect(options.database || options.filename, (err) => {
                if (err) {
                    return Utils.doError(err, callback);
                }

                cnx.attach(options, (err, ret) => {
                    if (!err) {
                        if (cnx.db) {
                            cnx.db.emit('connect', ret);
                        }
                        return Utils.doCallback(ret, callback);
                    }

                    cnx.createDatabase(options, callback);
                });
            });

        }, options);
    }
})();