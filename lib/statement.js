(function () {
    'use strict';

    class Statement {
        constructor(connection) {
            this.connection = connection;
            this.query = null;
        }

        close(callback) {
            this.connection.closeStatement(this, callback);
        }

        drop(callback) {
            this.connection.dropStatement(this, callback);
        }

        release(callback) {
            const cacheQuery = this.connection.getCachedQuery(this.query);
            if (cacheQuery) {
                this.connection.closeStatement(this, callback);
            } else {
                this.connection.dropStatement(this, callback);
            }
        }

        execute(transaction, params, callback, custom) {
            if (params instanceof Function) {
                custom = callback;
                callback = params;
                params = undefined;
            }

            this.custom = custom;
            this.connection.executeStatement(transaction, this, params, callback, custom);
        }

        fetch(transaction, count, callback) {
            this.connection.fetch(this, transaction, count, callback);
        }

        fetchAll(transaction, callback) {
            this.connection.fetchAll(this, transaction, callback);
        }
    }

    module.exports = Statement;
})();