(function () {
    'use strict';

    const Const = require('./const');
    const Utils = require('./utils');

    class Transaction {
        constructor(connection) {
            this.connection = connection;
            this.db = connection.db;
        }

        newStatement(query, callback) {
            // check cached queries
            const query_cache = this.connection.getCachedQuery(query);
            if (query_cache) {
                callback(null, query_cache);
                return;
            }

            this.connection.allocateStatement((err, statement) => {
                if (err) {
                    Utils.doError(err, callback);
                    return;
                }
                this.connection.prepareStatement(this, statement, query, false, callback);
            });
        }

        execute(query, params, callback, custom) {
            if (params instanceof Function) {
                callback = params;
                params = undefined;
            }

            this.newStatement(query, (err, statement) => {
                if (err) {
                    Utils.doError(err, callback);
                    return;
                }

                statement.execute(this, params, (err) => {
                    if (err) {
                        statement.release();
                        Utils.doCallback(err, callback);
                        return;
                    }

                    switch (statement.type) {
                        case Const.ISC_info_sql_stmt_select:
                            __fetchAllRows(this, statement, callback);
                            break;

                        case Const.ISC_info_sql_stmt_exec_procedure:
                            if (statement.output.length) {
                                __fetchSingleRow(this, statement, callback);
                            } else {
                                __releaseWithoutFetch(this, statement, callback);
                            }
                            break;

                        default:
                            __releaseWithoutFetch(this, statement, callback);
                            break;
                    }

                }, custom);
            });
        }

        query(query, params, callback) {
            if (params instanceof Function) {
                callback = params;
                params = undefined;
            }

            if (!callback) {
                callback = Utils.noop;
            }

            this.execute(query, params, callback, {asObject: true, asStream: callback === undefined || callback === null});
        }

        sequentially(query, params, on, callback, asArray) {
            if (params instanceof Function) {
                asArray = callback;
                callback = on;
                on = params;
                params = undefined;
            }

            if (!on) {
                throw new Error('Expected "on" delegate.');
            }

            const _on = (row, i, meta, next) => on(row, i, next);

            if (!callback) {
                callback = Utils.noop;
            }

            this.execute(query, params, callback, {asObject: !asArray, asStream: true, on: _on});
        }

        commit(callback) {
            this.connection.commit(this, callback);
        }

        rollback(callback) {
            this.connection.rollback(this, callback);
        }

        commitRetaining(callback) {
            this.connection.commitRetaining(this, callback);
        }

        rollbackRetaining(callback) {
            this.connection.rollbackRetaining(this, callback);
        }
    }

    module.exports = Transaction;

    function __fetchAllRows(transaction, statement, callback) {
        statement.fetchAll(transaction, (err, ret) => {
            if (err) {
                statement.release();
                Utils.doCallback(err, callback);
                return;
            }

            statement.release();

            if (callback) {
                callback(undefined, ret, statement.output, true);
            }
        });
    }

    function __fetchSingleRow(transaction, statement, callback) {
        statement.fetch(transaction, 1, (err, ret) => {
            if (err) {
                statement.release();
                Utils.doCallback(err, callback);
                return;
            }

            statement.release();

            if (callback) {
                callback(undefined, ret.data[0], statement.output, false);
            }
        });
    }

    function __releaseWithoutFetch(transaction, statement, callback) {
        statement.release();
        if (callback) {
            callback();
        }
    }
})();