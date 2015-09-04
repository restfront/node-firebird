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
        it('read transaction shouldn\'t modify data', function(done) {
            fb.attach(options, function(err, db) {
                assert.ifError(err);

                db.transaction(fb.ISOLATION_READ, function(err, transaction) {
                    assert.ifError(err);

                    transaction.query('INSERT INTO test_table (int_field) VALUES (1) ', function(err) {
                        assert.notEqual(err, null);
                        assert.equal(err.code, 335544361);

                        transaction.commit(function(err) {
                            assert.ifError(err);
                            done();
                        });
                    });
                });
            });
        });
    });
})();
