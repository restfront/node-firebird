/* jshint expr: true, mocha:true */
(function () {
    'use strict';

    const fs = require('fs');
    const assert = require('assert');
    const fb = require('../lib');

    const options = {
        host: 'rf-server',
        port: '3050',
        database: 'd:/bases/test/node_firebird.fdb',
        user: 'SYSDBA',
        password: 'masterkey'
    };

    describe('connection', () => {
        it('reconnection test', (done) => {
            fb.attach(options, (err, db) => {
                if (err) {
                    throw err;
                }

                db.on('reconnect', () => {
                    done();
                });

                db.connection._socket.end();
            });
        });

        it('write blob (stream)', (done) => {
            fb.attach(options, function (err, db) {
                assert.ifError(err);

                db.query('INSERT INTO blob_table (blob_field) VALUES(?) RETURNING (id)', [fs.createReadStream('test/image.png')], (err, result) => {
                    assert.ifError(err);
                    assert.notEqual(result, null);
                    assert.equal(typeof result, 'object');
                    assert(result.id > 0);

                    db.query('DELETE FROM blob_table WHERE id = ?', [result.id], (err, result) => {
                        assert.ifError(err);

                        done();
                    });
                });
            });
        });

        it('write blob (buffer)', (done) => {
            fb.attach(options, function (err, db) {
                assert.ifError(err);

                db.query('INSERT INTO blob_table (blob_field) VALUES(?) RETURNING (id)', [fs.readFileSync('test/image.png')], (err, result) => {
                    assert.ifError(err);
                    assert.notEqual(result, null);
                    assert.equal(typeof result, 'object');
                    assert(result.id > 0);

                    db.query('DELETE FROM blob_table WHERE id = ?', [result.id], (err, result) => {
                        assert.ifError(err);

                        done();
                    });
                });
            });
        });

        it('read blob', function (done) {
            var sql = "SELECT FIRST(1) blob_field FROM blob_table";

            fb.attach(options, function (err, db) {
                assert.ifError(err);

                db.transaction(fb.ISOLATION_READ, function (err, transaction) {
                    assert.ifError(err);

                    transaction.query(sql, function (err, result) {
                        assert.equal(err, null);
                        assert.notEqual(result, null);
                        assert.equal(result.length, 1);

                        assert.equal(typeof result[0].blob_field, 'function');

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

        it('read blob from procedure', function (done) {
            var sql = "SELECT p.data FROM p_get_blob p ";

            fb.attach(options, function (err, db) {
                assert.ifError(err);

                db.transaction(fb.ISOLATION_READ, function (err, transaction) {
                    assert.ifError(err);

                    transaction.query(sql, function (err, result) {
                        assert.equal(err, null);
                        assert.notEqual(result, null);
                        assert.equal(result.length, 1);

                        assert.equal(typeof result[0].data, 'function');

                        result[0].data(function (err, name, content) {
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

        it('partial simple packets', (done) => {
            const sql = `
                SELECT * FROM columns_table
            `;

            fb.attach(options, (err, db) => {
                assert.ifError(err);

                db.query(sql, (err, result, columns) => {
                    assert.equal(err, null);
                    assert.notEqual(result, null);
                    assert.notEqual(columns, null);
                    assert.equal(columns.length, 69);

                    db.detach(function (err) {
                        assert.ifError(err);

                        done();
                    });
                });
            });
        });

        it('partial fetch packets', (done) => {
            const sql = `
                SELECT FIRST(10000) * FROM big_table 
            `;

            fb.attach(options, (err, db) => {
                assert.ifError(err);

                db.query(sql, (err, result) => {
                    assert.equal(err, null);
                    assert.notEqual(result, null);
                    assert.equal(result.length, 10000);

                    db.detach(function (err) {
                        assert.ifError(err);

                        done();
                    });
                });
            });
        });
    });
})();