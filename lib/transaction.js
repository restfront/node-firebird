(function () {
    'use strict';

    var Const = require('./const');
    var Utils = require('./utils');

    module.exports = Transaction;

    function Transaction(connection) {
        this.connection = connection;
        this.db = connection.db;
    }

    Transaction.prototype.newStatement = function (query, callback) {
        var cnx = this.connection;
        var self = this;

        cnx.allocateStatement(function (err, statement) {
            if (err) {
                Utils.doError(err, callback);
                return;
            }
            cnx.prepareStatement(self, statement, query, false, callback);
        });
    };

    Transaction.prototype.execute = function (query, params, callback, custom) {
        if (params instanceof Function) {
            callback = params;
            params = undefined;
        }

        var self = this;
        this.newStatement(query, function (err, statement) {
            if (err) {
                Utils.doError(err, callback);
                return;
            }

            statement.execute(self, params, function (err) {
                if (err) {
                    statement.drop();
                    Utils.doCallback(err, callback);
                    return;
                }

                switch (statement.type) {
                    case Const.ISC_info_sql_stmt_select:
                        fetchAllRows(self, statement, callback);
                        break;

                    case Const.ISC_info_sql_stmt_exec_procedure:
                        if (statement.output.length) {
                            fetchSingleRow(self, statement, callback);
                        } else {
                            releaseWithoutFetch(self, statement, callback);
                        }
                        break;

                    default:
                        releaseWithoutFetch(self, statement, callback);
                        break;
                }

            }, custom);
        });
    };

    Transaction.prototype.query = function (query, params, callback) {

        if (params instanceof Function) {
            callback = params;
            params = undefined;
        }

        if (callback === undefined) {
            callback = Utils.noop;
        }

        this.execute(query, params, callback, {asObject: true, asStream: callback === undefined || callback === null});

    };

    Transaction.prototype.commit = function (callback) {
        this.connection.commit(this, callback);
    };

    Transaction.prototype.rollback = function (callback) {
        this.connection.rollback(this, callback);
    };

    Transaction.prototype.commitRetaining = function (callback) {
        this.connection.commitRetaining(this, callback);
    };

    Transaction.prototype.rollbackRetaining = function (callback) {
        this.connection.rollbackRetaining(this, callback);
    };

    function fetchAllRows(transaction, statement, callback) {
        statement.fetchAll(transaction, function (err, ret) {

            if (err) {
                statement.drop();
                Utils.doCallback(err, callback);
                return;
            }

            statement.drop();

            if (callback) {
                callback(undefined, ret, statement.output, true);
            }
        });
    }

    function fetchSingleRow(transaction, statement, callback) {
        statement.fetch(transaction, 1, function (err, ret) {
            if (err) {
                statement.drop();
                Utils.doCallback(err, callback);
                return;
            }

            statement.drop();

            if (callback) {
                callback(undefined, ret.data[0], statement.output, false);
            }
        });
    }

    function releaseWithoutFetch(transaction, statement, callback) {
        statement.drop();
        if (callback) {
            callback();
        }
    }
})();