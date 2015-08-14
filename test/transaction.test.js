(function () {
    'use strict';

    var fb = require('../lib');
    var assert = require('assert');

    var options = {
        host: 'localhost',
        port: '3050',
        database: 'd:/bases/node_firebird.fdb',
        user: 'SYSDBA',
        password: 'masterkey'
    };

    describe('tr', function () {
        /*
        it('read transaction shouldn\'t modify data', function(done) {
            fb.attach(options, function(err, db) {
                assert.ifError(err);

                db.transaction(fb.ISOLATION_WRITE, function(err, transaction) {
                    assert.ifError(err);

                    transaction.query('DELETE FROM test_table', function(err) {
                        assert.ifError(err);

                        transaction.commit(function(err) {
                            assert.ifError(err);
                            done();
                        });
                    });
                });
            });
        });
        */
    });
})();
