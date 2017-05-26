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

    describe('ddl', function () {
        after(__clear);

        it('should create table', function (done) {
            fb.attach(options, function (err, db) {
                if (err) { throw err; }

                db.query('CREATE TABLE test (ID INT, PARENT BIGINT, NAME VARCHAR(50), FILE BLOB, CREATED TIMESTAMP)', function (err, result) {
                    if (err) { throw err; }

                    db.query("SELECT rdb$relation_name AS name FROM rdb$relations WHERE rdb$relation_name = 'TEST'", function (err, result) {
                        if (err) { throw err; }

                        assert(result, 'result is null');
                        assert(Array.isArray(result), 'result is not an array');
                        assert(result.length === 1, 'result array has invalid length');
                        assert(result[0].name.trim() === 'TEST', 'result data is invalid');

                        done();
                    });
                });
            });
        });
    });

    function __clear(done) {
        fb.attach(options, function (err, db) {
            if (err) { throw err; }

            db.query('DROP TABLE test', function (err, result) {
                if (err) { throw err; }

                done();
            });
        });
    }
})();