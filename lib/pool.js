(function () {
    'use strict';

    module.exports = Pool;

    function Pool(max, options, attachFunction) {
        this.internaldb = []; // connection created by the pool (for destroy)
        this.pooldb = [];     // available connection in the pool
        this.dbinuse = 0;     // connection currently in use into the pool
        this.max = max || 4;
        this.pending = [];
        this.options = options;

        this.attachFunction = attachFunction;
    }

    Pool.prototype.get = function (callback) {
        this.pending.push(callback);
        check(this);
        return this;
    };

    Pool.prototype.destroy = function () {
        var self = this;
        this.internaldb.forEach(function (db) {
            if (!db.connection._pooled) {
                return;
            }
            // check if the db is not free into the pool otherwise user should manual detach it
            var _db_in_pool = self.pooldb.indexOf(db);
            if (_db_in_pool !== -1) {
                self.pooldb.splice(_db_in_pool, 1);
                db.connection._pooled = false;
                db.detach();
            }
        });
        this.internaldb = [];
    };

    function check(pool) {
        if (pool.dbinuse >= pool.max) {
            return pool;
        }

        var cb = pool.pending.shift();
        if (!cb) {
            return pool;
        }

        pool.dbinuse++;
        if (pool.pooldb.length) {
            cb(null, pool.pooldb.shift());
        } else {
            var _db = null;

            pool.attachFunction(pool.options, function (err, db) {
                if (!err) {
                    pool.internaldb.push(db);
                    db.on('detach', function () {
                        // also in pool (could be a twice call to detach)
                        if (pool.pooldb.indexOf(db) !== -1 || pool.internaldb.indexOf(db) === -1) {
                            return;
                        }
                        // if not usable don't put in again in the pool and remove reference on it
                        if (db.connection._isClosed || db.connection._isDetach || !db.connection._pooled) {
                            pool.internaldb.splice(pool.internaldb.indexOf(db), 1);
                        } else {
                            pool.pooldb.push(db);
                        }

                        if (db.connection._pooled) {
                            pool.dbinuse--;
                        }
                        check(pool);
                    });
                } else {
                    // attach fail so not in the pool
                    pool.dbinuse--;
                }

                cb(err, db);
            });
        }

        setImmediate(function () {
            check(pool);
        });

        return pool;
    }
})();