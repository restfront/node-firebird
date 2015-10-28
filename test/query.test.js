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

    describe('query', function () {
        it('should insert integer value', function (done) {
            fb.attach(options, function(err, db) {
                if (err) { throw err; }

                db.query('INSERT INTO test_table (int_field) VALUES(?) RETURNING (int_field)', [1], function(err, result) {
                    if (err) { throw err; }

                    assert.notEqual(result, null);
                    assert.equal(typeof result, 'object');
                    assert.equal(result.int_field, 1);
                    done();
                });
            });
        });

        it('should insert null value', function (done) {
            fb.attach(options, function(err, db) {
                if (err) { throw err; }

                db.query('INSERT INTO test_table (int_field) VALUES(?) RETURNING (int_field)', [null], function(err, result) {
                    if (err) { throw err; }

                    assert.notEqual(result, null);
                    assert.equal(typeof result, 'object');
                    assert.equal(result.int_field, null);
                    done();
                });
            });
        });

        it('should insert undefined value', function (done) {
            fb.attach(options, function(err, db) {
                if (err) { throw err; }

                db.query('INSERT INTO test_table (int_field) VALUES(?) RETURNING (int_field)', [undefined], function(err, result) {
                    if (err) { throw err; }

                    assert.notEqual(result, null);
                    assert.equal(typeof result, 'object');
                    assert.equal(result.int_field, null);
                    done();
                });
            });
        });

        after(function(done) {
            fb.attach(options, function(err, db) {
                if (err) { throw err; }

                db.query('DELETE FROM test_table', function(err, result) {
                    if (err) { throw err; }

                    done();
                });
            });
        });
    });
})();