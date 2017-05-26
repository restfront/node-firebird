(function () {
    'use strict';

    const Events = require('events');
    const Utils = require('./utils');
    const Blob = require('./blob');
    const DatabaseEvents = require('./databaseEvents');

    class Database extends Events.EventEmitter {
        /**
         *
         * @param connection
         */
        constructor(connection) {
            super();

            this.maxtryreconnect = 3;
            this.connection = connection;
            this.eventid = 1;
            connection.db = this;
        }

        /**
         *
         * @param callback
         * @param force
         * @return {Database}
         */
        detach(callback, force) {
            if (!force && this.connection.inOperation()) {
                this.connection._detachAuto = true;
                this.connection._detachCallback = callback;
                return this;
            }

            this.connection.detach((err, obj) => {
                this.connection.disconnect();
                this.emit('detach', false);

                if (callback) {
                    callback(err, obj);
                }
            }, force);

            return this;
        }

        /**
         *
         * @param isolation
         * @param callback
         * @return {*}
         */
        transaction(isolation, callback) {
            return this.startTransaction(isolation, callback);
        }

        /**
         *
         * @param isolation
         * @param callback
         * @return {Database}
         */
        startTransaction(isolation, callback) {
            this.connection.startTransaction(isolation, callback);
            return this;
        }

        /**
         *
         * @param query
         * @param callback
         * @return {Database}
         */
        newStatement(query, callback) {
            this.startTransaction((err, transaction) => {
                if (err) {
                    callback(err);
                    return;
                }

                transaction.newStatement(query, (err, statement) => {
                    if (err) {
                        callback(err);
                        return;
                    }

                    transaction.commit((err) => {
                        callback(err, statement);
                    });
                });
            });

            return this;
        }

        /**
         *
         * @param query
         * @param params
         * @param callback
         * @param custom
         * @return {Database}
         */
        execute(query, params, callback, custom) {
            if (params instanceof Function) {
                callback = params;
                params = undefined;
            }

            this.connection.startTransaction((err, transaction) => {
                if (err) {
                    Utils.doError(err, callback);
                    return;
                }

                transaction.execute(query, params, (err, result, meta, isSelect) => {
                    if (err) {
                        transaction.rollback(() => {
                            Utils.doError(err, callback);
                        });
                        return;
                    }

                    Blob.fetchBlob(result, meta, isSelect, (err, result) => {
                        // error during blob fetch
                        if (err) {
                            transaction.rollback(() => {
                                Utils.doError(err, callback);
                            });
                            return;
                        }

                        transaction.commit((err) => {
                            if (callback) {
                                callback(err, result, meta, isSelect);
                            }
                        });
                    });

                }, custom);
            });

            return this;
        }

        /**
         *
         * @param query
         * @param params
         * @param on
         * @param callback
         * @param asArray
         * @return {Database}
         */
        sequentially(query, params, on, callback, asArray) {
            if (params instanceof Function) {
                asArray = callback;
                callback = on;
                on = params;
                params = undefined;
            }

            if (on === undefined) {
                throw new Error('Expected "on" delegate.');
            }

            const _on = (row, i, meta, next) => {
                Blob.fetchBlob([row], meta, true, (err) => {
                    if (err) {
                        return next(err);
                    }
                    on(row, i, next);
                });
            };

            this.execute(query, params, callback, {asObject: !asArray, asStream: true, on: _on});
            return this;
        }

        /**
         *
         * @param query
         * @param params
         * @param callback
         * @return {Database}
         */
        query(query, params, callback) {
            if (params instanceof Function) {
                callback = params;
                params = undefined;
            }

            this.execute(query, params, callback, {asObject: true, asStream: callback === undefined || callback === null});
            return this;
        }

        /**
         *
         * @param callback
         * @return {Database}
         */
        attachEvent(callback) {
            this.connection.connectRequest((err, socket_info) => {
                if (err) {
                    Utils.doError(err, callback);
                    return;
                }

                const eventConnection = new DatabaseEvents.EventConnection(this.connection.host, socket_info.port, (err) => {
                    if (err) {
                        Utils.doError(err, callback);
                        return;
                    }

                    const evt = new DatabaseEvents.FbEventManager(this, eventConnection, this.eventid++, (err) => {
                        if (err) {
                            Utils.doError(err, callback);
                            return;
                        }

                        callback(err, evt);
                    });

                }, this);
            });
            return this;
        }
    }

    module.exports = Database;
})();