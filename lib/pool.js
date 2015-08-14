(function () {
    'use strict';

    module.exports = Pool;

    function Pool(max, options, attachFunction) {
        this.internaldb = []; // connection created by the pool (only for destroy)
        this.pooldb = []; // available connection in the pool
        this.dbinuse = 0; // connection currently in use into the pool
        this.max = max || 4;
        this.pending = [];
        this.options = options;

        this.attachFunction = attachFunction;
    }

    Pool.prototype.get = function (callback) {
        var self = this;
        self.pending.push(callback);
        self.check();
        return self;
    };

    Pool.prototype.check = function () {

        var self = this;
        if (self.dbinuse >= self.max) {
            return self;
        }

        var cb = self.pending.shift();
        if (!cb) {
            return self;
        }

        self.dbinuse++;
        if (self.pooldb.length) {
            cb(null, self.pooldb.shift());
        } else {
            var _db = null;

            this.attachFunction(self.options, function (err, db) {
                if (!err) {
                    _db = db; // associate this callback to a connection for error association
                    self.internaldb.push(_db);
                    _db.on('detach', function () {
                        // also in pool (could be a twice call to detach)
                        if (self.pooldb.indexOf(_db) !== -1 || self.internaldb.indexOf(_db) === -1) {
                            return;
                        }

                        // if not usable don't put in again in the pool and remove reference on it
                        if (_db.connection._isClosed || _db.connection._isDetach || !_db.connection._pooled) {
                            self.internaldb.splice(self.internaldb.indexOf(_db), 1);
                        } else {
                            self.pooldb.push(_db);
                        }

                        if (_db.connection._pooled) {
                            self.dbinuse--;
                        }
                        self.check();
                    });
                } else {
                    // attach fail so not in the pool
                    if (!_db) {
                        self.dbinuse--;
                    }
                }

                cb(err, db);
            });
        }

        setImmediate(function () {
            self.check();
        });

        return self;
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
})();