(function () {
    'use strict';

    const GDSError = require('./error').GDSError;

    module.exports.escape = escape;
    module.exports.noop = noop;

    module.exports.isError = isError;
    module.exports.doCallback = doCallback;
    module.exports.doError = doError;
    module.exports.doSynchronousLoop = doSynchronousLoop;

    module.exports.formatDate = formatDate;
    module.exports.parseDate = parseDate;

    /***************************************
     *
     *   Common
     *
     ***************************************/

    /**
     * Escape value
     * @param {Object} value Value to escape
     * @return {String} Escaped value
     */
    function escape(value) {
        if (value === null || value === undefined) {
            return 'NULL';
        }

        switch (typeof(value)) {
            case 'boolean':
                return value ? '1' : '0';
            case 'number':
                return value.toString();
            case 'string':
                return "'" + value.replace(/'/g, "''").replace(/\\/g, '\\\\') + "'";
        }

        if (value instanceof Date) {
            return "'" + formatDate(value) + "'";
        }

        throw new Error('Escape supports only primitive values.');
    }

    function noop() {}

    /***************************************
     *
     *   Error handling
     *
     ***************************************/

    function isError(obj) {
        return (obj instanceof Object && obj.status);
    }

    function doCallback(obj, callback) {
        if (!callback) {
            return;
        }

        if (obj instanceof Error) {
            callback(obj);
            return;
        }

        if (isError(obj)) {
            callback(new GDSError(obj));
            return;
        }

        callback(undefined, obj);
    }

    function doError(obj, callback) {
        if (callback) {
            callback(obj);
        }
    }

    function doSynchronousLoop(data, processData, done) {
        if (data.length > 0) {
            var loop = function (data, i, processData, done) {
                processData(data[i], i, function (err) {
                    if (++i < data.length && !err) {
                        loop(data, i, processData, done);
                    } else {
                        done(err);
                    }
                });
            };
            loop(data, 0, processData, done);
        } else {
            done();
        }
    }

    /***************************************
     *
     *   Date <-> String
     *
     ***************************************/

    function formatDate(date) {
        // firebird starts numbering month from 1
        var monthNumber = date.getMonth() + 1;

        return date.getFullYear() + '-' +
            padLeft(monthNumber.toString(), 2, '0') + '-' +
            padLeft(date.getDate().toString(), 2, '0') + ' ' +
            padLeft(date.getHours().toString(), 2, '0') + ':' +
            padLeft(date.getMinutes().toString(), 2, '0') + ':' +
            padLeft(date.getSeconds().toString(), 2, '0');
    }

    /**
     * Parse date from string
     * @return {Date}
     */
    function parseDate(string) {
        string = string.trim();

        var i;
        var arr = string.indexOf(' ') === -1 ? string.split('T') : string.split(' ');
        var index = arr[0].indexOf(':');
        var length = arr[0].length;

        if (index !== -1) {
            var tmp = arr[1];
            arr[1] = arr[0];
            arr[0] = tmp;
        }

        if (arr[0] === undefined) {
            arr[0] = '';
        }

        var noTime = arr[1] === undefined ? true : arr[1].length === 0;

        for (i = 0; i < length; i++) {
            var c = arr[0].charCodeAt(i);
            if (c > 47 && c < 58) {
                continue;
            }
            if (c === 45 || c === 46) {
                continue;
            }

            if (noTime) {
                return new Date(string);
            }
        }

        if (arr[1] === undefined) {
            arr[1] = '00:00:00';
        }

        var firstDay = arr[0].indexOf('-') === -1;

        var date = (arr[0] || '').split(firstDay ? '.' : '-');
        var time = (arr[1] || '').split(':');
        var parsed = [];

        if (date.length < 4 && time.length < 2) {
            return new Date(string);
        }

        index = (time[2] || '').indexOf('.');

        // milliseconds
        if (index !== -1) {
            time[3] = time[2].substring(index + 1);
            time[2] = time[2].substring(0, index);
        } else {
            time[3] = '0';
        }

        parsed.push(parseInt(date[firstDay ? 2 : 0], 10)); // year
        parsed.push(parseInt(date[1], 10)); // month
        parsed.push(parseInt(date[firstDay ? 0 : 2], 10)); // day
        parsed.push(parseInt(time[0], 10)); // hours
        parsed.push(parseInt(time[1], 10)); // minutes
        parsed.push(parseInt(time[2], 10)); // seconds
        parsed.push(parseInt(time[3], 10)); // miliseconds

        var def = new Date();

        length = parsed.length;
        for (i = 0; i < length; i++) {
            if (isNaN(parsed[i])) {
                parsed[i] = 0;
            }

            var value = parsed[i];
            if (value !== 0) {
                continue;
            }

            switch (i) {
                case 0:
                    if (value <= 0) {
                        parsed[i] = def.getFullYear();
                    }
                    break;
                case 1:
                    if (value <= 0) {
                        parsed[i] = def.getMonth() + 1;
                    }
                    break;
                case 2:
                    if (value <= 0) {
                        parsed[i] = def.getDate();
                    }
                    break;
            }
        }

        return new Date(parsed[0], parsed[1] - 1, parsed[2], parsed[3], parsed[4], parsed[5]);
    }

    function padLeft(string, max, c) {
        if (max > string.length) {
            return new Array(Math.max(0, max - string.length + 1)).join(c || ' ') + string;
        } else {
            return string;
        }
    }
})();