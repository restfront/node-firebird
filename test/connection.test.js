/* jshint expr: true, mocha:true */
(function () {
    'use strict';

    var fb = require('../lib');
    var assert = require('assert');

    var options = {
        host: 'rf-server',
        port: '3050',
        database: 'd:/bases/test/node_firebird.fdb',
        user: 'SYSDBA',
        password: 'masterkey'
    };

    describe('connection', function () {
        it('reconnection test', function (done) {
            fb.attach(options, function (err, db) {
                if (err) {
                    throw err;
                }

                db.on('reconnect', function () {
                    done();
                });

                db.connection._socket.end();
            });
        });

        it('read blob', function (done) {
            var sql = "SELECT blob_field FROM blob_table";

            fb.attach(options, function (err, db) {
                assert.ifError(err);

                db.transaction(fb.ISOLATION_READ, function (err, transaction) {
                    assert.ifError(err);

                    transaction.query(sql, function (err, result) {
                        assert.equal(err, null);
                        assert.notEqual(result, null);
                        assert.equal(result.length, 1);

                        result[0].blob_field(function (err, name, content) {
                            assert.ifError(err);

                            content.on('error', function (err) {
                                assert.ifError(err);
                            });

                            content.on('data', function (chunk) {
                                //
                            });

                            content.on('end', function () {
                                transaction.commit(function (err) {
                                    assert.ifError(err);

                                    db.detach(function (err) {
                                        assert.ifError(err);

                                        done();
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
})();