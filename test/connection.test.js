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
                if (err) { throw err; }

                db.on('reconnect', function () {
                    done();
                });

                db.connection._socket.end();
            });
        });
    });
})();