(function () {
    'use strict';

    const Events = require('events');

    const Fields = require('./fields');
    const Serialize = require('./serialize.js');

    module.exports = {
        fetchBlob,
        createBlobAsyncReader
    };

    function fetchBlob(rows, meta, isSelect, callback) {
        if (!isSelect || !rows.length) {
            return callback(null, rows);
        }

        // get blob columns
        const blobColumns = __searchBlobColumns(rows[0], meta);
        // no blobs
        if (!blobColumns.length) {
            return callback(null, rows);
        }
        let blobsCount = rows.length * blobColumns.length;
        rows.forEach((row) => {
            blobColumns.forEach((col) => {
                __readBlob(row[col], (err, data) => {
                    blobsCount--;
                    row[col] = data;
                    if (blobsCount === 0) {
                        return callback(null, rows);
                    }
                });
            });
        });
    }

    function createBlobAsyncReader(statement, transaction, id, name) {
        if (!id) {
            return null;
        }

        return function (callback) {
            // callback(err, buffer, name);
            statement.connection.beginOperation('openBlob');
            statement.connection.openBlob(id, transaction, (err, blob) => {
                if (err) {
                    return callback(err, name, null);
                }

                let emitter = new Events.EventEmitter();
                emitter.pipe = function (stream) {
                    emitter.on('data', (chunk) => {
                        stream.write(chunk);
                    });
                    emitter.on('end', () => {
                        stream.end();
                    });
                };

                function read() {
                    statement.connection.getSegment(blob, (err, segment) => {
                        if (err) {
                            return emitter.emit('error', err);
                        }

                        if (segment.buffer) {
                            const blr = new Serialize.BlrReader(segment.buffer);
                            const data = blr.readSegment();

                            emitter.emit('data', data);
                        }

                        if (segment.handle !== 2) {
                            read();
                            return;
                        }

                        statement.connection.closeBlob(blob);
                        emitter.emit('end');
                        emitter = null;
                    });
                }

                callback(null, name, emitter);
                read();
            });
        };
    }

    function __searchBlobColumns(row, meta) {
        const result = [];
        const asObject = Object.keys(row);
        //search if there are blob field
        for (let column in meta) {
            if (meta.hasOwnProperty(column) && Fields.isSQLVarBlob(meta[column])) {
                result.push(asObject[column]);
            }
        }
        return result;
    }

    function __readBlob(blobAsyncReader, callback) {
        if (!blobAsyncReader) {
            return callback(null, null);
        }

        blobAsyncReader((err, name, emitter) => {
            if (err) {
                return callback(err);
            }

            const data = [];
            let length = 0;
            emitter.on('data', (chunk) => {
                length += chunk.length;
                data.push(chunk);
            });
            emitter.on('end', () => {
                return callback(null, Buffer.concat(data, length));
            });
            emitter.on('error', (err) => {
                return callback(err);
            });
        });
    }
})();