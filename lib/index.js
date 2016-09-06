(function () {
    'use strict';

    var Connection = require('./connection');
    var Pool = require('./pool');
    var Utils = require('./utils');
    var Const = require('./const');

    // Letting external access to transaction isolation options
    module.exports.ISOLATION_READ_UNCOMMITTED = Const.ISOLATION_READ_UNCOMMITTED;
    module.exports.ISOLATION_READ_COMMITED = Const.ISOLATION_READ_COMMITED;
    module.exports.ISOLATION_REPEATABLE_READ = Const.ISOLATION_REPEATABLE_READ;
    module.exports.ISOLATION_SERIALIZABLE = Const.ISOLATION_SERIALIZABLE;
    module.exports.ISOLATION_READ_COMMITED_READ_ONLY = Const.ISOLATION_READ_COMMITED_READ_ONLY;
    module.exports.ISOLATION_READ = Const.ISOLATION_READ;
    module.exports.ISOLATION_WRITE = Const.ISOLATION_WRITE;

    // Defaults
    var DEFAULT_HOST = '127.0.0.1';
    var DEFAULT_PORT = 3050;

    if (typeof(setImmediate) === 'undefined') {
        global.setImmediate = function (cb) {
            process.nextTick(cb);
        };
    }

    /**
     * Escape value
     * @param {Object} value
     * @return {String}
     */
    module.exports.escape = Utils.escape;

    /**
     * Attach a database
     * @param options
     * @param callback
     */
    module.exports.attach = attach;

    /**
     * Create a database
     * @param options
     * @param callback
     */
    module.exports.create = create;

    /**
     * Attach or create database
     * @param options
     * @param callback
     */
    module.exports.attachOrCreate = attachOrCreate;

    /**
     * Create a connection pooling
     * @param max
     * @param options
     * @param callback
     * @returns {Pool}
     */
    module.exports.pool = function (max, options, callback) {
        var pool = new Pool(max, options, attach);
        options.isPool = true;
        return pool;
    };

    /**
     * Attach to a database
     * @param options
     * @param callback
     */
    function attach(options, callback) {
        var host = options.host || DEFAULT_HOST;
        var port = options.port || DEFAULT_PORT;
        var manager = options.manager || false;

        var cnx = new Connection(host, port, function (err) {
            if (err) {
                return Utils.doError(err, callback);
            }

            cnx.connect(options.database || options.filename, function (err) {
                if (err) {
                    return Utils.doError(err, callback);
                }

                if (manager) {
                    cnx.svcattach(options, callback);
                } else {
                    cnx.attach(options, callback);
                }
            });
        }, options);
    }

    /**
     * Create a database
     * @param options
     * @param callback
     */
    function create(options, callback) {
        var host = options.host || DEFAULT_HOST;
        var port = options.port || DEFAULT_PORT;

        var cnx = new Connection(host, port, function (err) {
            var self = cnx;

            cnx.connect(options.database || options.filename, function (err) {
                if (err) {
                    if (self.db) {
                        self.db.emit('error', err);
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
        var host = options.host || DEFAULT_HOST;
        var port = options.port || DEFAULT_PORT;

        var cnx = new Connection(host, port, function (err) {
            var self = cnx;

            if (err) {
                return Utils.doError({error: err, message: "Connect error"}, callback);
            }

            cnx.connect(options.database || options.filename, function (err) {
                if (err) {
                    return Utils.doError(err, callback);
                }

                cnx.attach(options, function (err, ret) {
                    if (!err) {
                        if (self.db) {
                            self.db.emit('connect', ret);
                        }
                        return Utils.doCallback(ret, callback);
                    }

                    cnx.createDatabase(options, callback);
                });
            });

        }, options);
    }
})();