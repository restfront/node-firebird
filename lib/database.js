(function () {
    'use strict';

    var Events = require('events');
    var Utils = require('./utils');

    module.exports = Database;

    function Database(connection) {
        this.connection = connection;
        connection.db = this;
    }

    Database.prototype = Object.create(Events.EventEmitter.prototype);
    Database.prototype.constructor = Database;

    Database.prototype.escape = function (value) {
        return exports.escape(value);
    };

    Database.prototype.detach = function (callback, force) {
        var self = this;

        if (!force && self.connection.inOperation()) {
            self.connection._detachAuto = true;
            self.connection._detachCallback = callback;
            return self;
        }

        if (self.connection._pooled === false) {
            self.connection.detach(function (err, obj) {

                self.connection.disconnect();
                self.emit('detach', false);

                if (callback) {
                    callback(err, obj);
                }

            }, force);
        } else {
            self.emit('detach', false);
            if (callback) {
                callback();
            }
        }

        return self;
    };

    Database.prototype.transaction = function (isolation, callback) {
        return this.startTransaction(isolation, callback);
    };

    Database.prototype.startTransaction = function (isolation, callback) {
        this.connection.startTransaction(isolation, callback);
        return this;
    };

    Database.prototype.newStatement = function (query, callback) {

        this.startTransaction(function (err, transaction) {

            if (err) {
                callback(err);
                return;
            }

            transaction.newStatement(query, function (err, statement) {

                if (err) {
                    callback(err);
                    return;
                }

                transaction.commit(function (err) {
                    callback(err, statement);
                });
            });
        });

        return this;
    };

    Database.prototype.execute = function (query, params, callback, custom) {

        if (params instanceof Function) {
            callback = params;
            params = undefined;
        }

        var self = this;

        self.connection.startTransaction(function (err, transaction) {

            if (err) {
                Utils.doError(err, callback);
                return;
            }

            transaction.execute(query, params, function (err, result, meta, isSelect) {
                if (err) {
                    transaction.rollback(function () {
                        Utils.doError(err, callback);
                    });
                    return;
                }

                transaction.commit(function (err) {
                    if (callback) {
                        callback(err, result, meta, isSelect);
                    }
                });

            }, custom);
        });

        return self;
    };

    Database.prototype.sequentially = function (query, params, on, callback, asArray) {

        if (params instanceof Function) {
            asArray = callback;
            callback = on;
            on = params;
            params = undefined;
        }

        if (on === undefined) {
            throw new Error('Expected "on" delegate.');
        }

        var self = this;
        self.execute(query, params, callback, {asObject: !asArray, asStream: true, on: on});
        return self;
    };

    Database.prototype.query = function (query, params, callback) {

        if (params instanceof Function) {
            callback = params;
            params = undefined;
        }

        var self = this;
        self.execute(query, params, callback, {asObject: true, asStream: callback === undefined || callback === null});
        return self;
    };
})();