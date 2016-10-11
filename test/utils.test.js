/* jshint expr: true, mocha:true */
(function () {
    'use strict';

    var utils = require('../lib/utils');
    var assert = require('assert');

    describe('utils', function () {
        it('.escape() should properly escape "null" and "undefined"', function () {
            assert.equal(utils.escape(null), 'NULL');
            assert.equal(utils.escape(), 'NULL');
        });

        it('.escape() should properly escape "boolean" values', function () {
            assert.equal(utils.escape(false), '0');
            assert.equal(utils.escape(true), '1');
        });

        it('.escape() should properly escape "number" values', function () {
            assert.equal(utils.escape(-100), '-100');
            assert.equal(utils.escape(-100.0001), '-100.0001');
            assert.equal(utils.escape(0), '0');
            assert.equal(utils.escape(100.0001), '100.0001');
        });

        it('.escape() should properly escape "string" values', function () {
            assert.equal(utils.escape("test"), "'test'");
            assert.equal(utils.escape("single'quote"), "'single''quote'");
            assert.equal(utils.escape("two single''quotes"), "'two single''''quotes'");
        });

        it('.escape() should properly escape "date/time" values', function () {
            assert.equal(utils.escape(new Date(2016, 8, 11)), "'2016-09-11 00:00:00'");
            assert.equal(utils.escape(new Date(2016, 9, 11, 10, 21, 35)), "'2016-10-11 10:21:35'");
            assert.equal(utils.escape(new Date(2016, 0, 11)), "'2016-01-11 00:00:00'");
            assert.equal(utils.escape(new Date(2016, 11, 11, 10, 21, 35)), "'2016-12-11 10:21:35'");
        });
    });
})();