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

    describe('tr', function () {
        it("read transaction shouldn't modify data", function (done) {
            fb.attach(options, function (err, db) {
                assert.ifError(err);

                db.transaction(fb.ISOLATION_READ, function (err, transaction) {
                    assert.ifError(err);

                    transaction.query('INSERT INTO test_table (int_field) VALUES (1) ', function (err) {
                        assert.notEqual(err, null);
                        assert.equal(err.code, 335544361);

                        transaction.commit(function (err) {
                            assert.ifError(err);
                            done();
                        });
                    });
                });
            });
        });

        it('should execute block without return value', function (done) {
            this.timeout(500);

            var sql = "" +
                "EXECUTE BLOCK " +
                "AS " +
                "  DECLARE VARIABLE key BIGINT; " +
                "BEGIN " +
                "  key = 1; " +
                "END";

            fb.attach(options, function (err, db) {
                assert.ifError(err);

                db.transaction(fb.ISOLATION_READ, function (err, transaction) {
                    assert.ifError(err);

                    transaction.query(sql, function (err) {
                        assert.equal(err, null);

                        transaction.commit(function (err) {
                            assert.ifError(err);
                            done();
                        });
                    });
                });
            });
        });

        it('can fetch many rows', (done) => {
            var sql = "" +
                "EXECUTE BLOCK \n" +
                "RETURNS (val INTEGER) \n" +
                "AS \n" +
                "BEGIN \n" +
                "  val = 0; \n" +
                "  WHILE (val < 50000) DO \n" +
                "  BEGIN \n" +
                "    val = val + 1; \n" +
                "    SUSPEND; \n" +
                "  END \n" +
                "END";

            fb.attach(options, (err, db) => {
                assert.ifError(err);

                db.transaction(fb.ISOLATION_READ, (err, transaction) => {
                    assert.ifError(err);

                    transaction.query(sql, (err, result) => {
                        assert.equal(err, null);
                        assert.notEqual(result, null);
                        assert.equal(result.length, 50000);

                        transaction.commit((err) => {
                            assert.ifError(err);
                            done();
                        });
                    });
                });
            });
        });
    });
})();
