(function () {
    'use strict';

    const net = require('net');
    const os = require('os');

    const Database = require('./database');
    const Statement = require('./statement');
    const Transaction = require('./transaction');
    const Fields = require('./fields');
    const Messages = require('./messages.js');
    const Serialize = require('./serialize.js');
    const Blob = require('./blob');
    const Utils = require('./utils');
    const Const = require('./const');

    class Connection {
        /**
         *
         * @param host
         * @param port
         * @param callback
         * @param options
         * @param db
         * @param svc
         */
        constructor(host, port, callback, options, db, svc) {
            this.db = db;
            this.svc = svc;
            this.host = host;
            this.port = port;
            this.options = options;

            this._msg = new Serialize.XdrWriter(32);
            this._blr = new Serialize.BlrWriter(32);
            this._queue = [];
            this._detachCallback = null;
            this._detachAuto = false;
            this._socket = net.createConnection(port, host);
            this._pending = [];
            this._isClosed = false;
            this._isDetach = false;
            this._max_cached_query = options.maxCachedQuery || -1;
            this._cache_query = options.cacheQuery ? {} : null;

            this._socket.on('connect', () => __onConnectionConnect(this, callback));
            this._socket.on('close', () => __onConnectionClose(this, callback));

            this._socket.on('error', (error) => __onConnectionError(this, error));
            this._socket.on('data', (data) => __onConnectionData(this, data));
        }

        /**
         *
         * @param database
         * @param callback
         */
        connect(database, callback) {
            this._msg.pos = 0;
            this._msg.addInt(Const.OP_connect);
            this._msg.addInt(Const.OP_attach);
            this._msg.addInt(Const.CONNECT_VERSION2);
            this._msg.addInt(Const.ARCHITECTURE_GENERIC);
            this._msg.addString(database || '', Const.DEFAULT_ENCODING);
            this._msg.addInt(1);  // Protocol version understood count.

            this._blr.pos = 0;
            this._blr.addString(1, 'Unknown', Const.DEFAULT_ENCODING);
            this._blr.addString(4, os.hostname(), Const.DEFAULT_ENCODING);
            this._blr.addBytes([6, 0]);
            this._msg.addBlr(this._blr);

            this._msg.addInt(Const.PROTOCOL_VERSION10);
            this._msg.addInt(Const.ARCHITECTURE_GENERIC);
            this._msg.addInt(2);  // Min type
            this._msg.addInt(3);  // Max type
            this._msg.addInt(2);  // Preference weight

            this.__queueEvent(this._msg, callback);
        }

        /**
         *
         */
        disconnect() {
            this._socket.end();
        }

        /**
         *
         * @param options
         * @param callback
         * @param db
         */
        attach(options, callback, db) {
            this._lowercase_keys = options.lowercase_keys || Const.DEFAULT_LOWERCASE_KEYS;

            this._msg.pos = 0;
            this._msg.addInt(Const.OP_attach);
            this._msg.addInt(0);  // Database Object ID
            this._msg.addString(options.database || options.filename, Const.DEFAULT_ENCODING);

            this._blr.pos = 0;
            this._blr.addByte(1);
            this._blr.addString(Const.ISC_dpb_lc_ctype, 'UTF8', Const.DEFAULT_ENCODING);
            this._blr.addString(Const.ISC_dpb_user_name, options.user || Const.DEFAULT_USER, Const.DEFAULT_ENCODING);
            this._blr.addString(Const.ISC_dpb_password, options.password || Const.DEFAULT_PASSWORD, Const.DEFAULT_ENCODING);
            if (options.role) {
                this._blr.addString(Const.ISC_dpb_sql_role_name, options.role, Const.DEFAULT_ENCODING);
            }
            this._msg.addBlr(this._blr);

            const cb = (err, ret) => {
                if (err) {
                    Utils.doError(err, callback);
                    return;
                }

                this.dbhandle = ret.handle;
                if (callback) {
                    callback(undefined, ret);
                }
            };

            // For reconnect
            if (db) {
                db.connection = this;
                cb.response = db;
            } else {
                cb.response = new Database(this);
                cb.response.removeAllListeners('error');
                cb.response.on('error', Utils.noop);
            }

            this.__queueEvent(this._msg, cb);
        }

        /**
         *
         * @param callback
         */
        detach(callback) {
            if (this._isClosed) {
                return;
            }

            this._isDetach = true;

            this._msg.pos = 0;
            this._msg.addInt(Const.OP_detach);
            this._msg.addInt(0); // Database Object ID

            this.__queueEvent(this._msg, (err, ret) => {
                delete this.dbhandle;
                if (callback) {
                    callback(err, ret);
                }
            });
        }

        /**
         *
         * @param options
         * @param callback
         */
        createDatabase(options, callback) {
            this._msg.pos = 0;
            this._msg.addInt(Const.OP_create);  // op_create
            this._msg.addInt(0);          // Database Object ID
            this._msg.addString(options.database || options.filename, Const.DEFAULT_ENCODING);

            this._blr.pos = 0;
            this._blr.addByte(1);
            this._blr.addString(Const.ISC_dpb_set_db_charset, 'UTF8', Const.DEFAULT_ENCODING);
            this._blr.addString(Const.ISC_dpb_lc_ctype, 'UTF8', Const.DEFAULT_ENCODING);
            this._blr.addString(Const.ISC_dpb_user_name, options.user || Const.DEFAULT_USER, Const.DEFAULT_ENCODING);
            this._blr.addString(Const.ISC_dpb_password, options.password || Const.DEFAULT_PASSWORD, Const.DEFAULT_ENCODING);
            if (options.role) {
                this._blr.addString(Const.ISC_dpb_sql_role_name, options.role, Const.DEFAULT_ENCODING);
            }
            this._blr.addNumeric(Const.ISC_dpb_sql_dialect, 3);
            this._blr.addNumeric(Const.ISC_dpb_force_write, 1);
            this._blr.addNumeric(Const.ISC_dpb_page_size, options.pageSize || Const.DEFAULT_PAGE_SIZE);
            this._msg.addBlr(this._blr);

            const cb = (err, ret) => {
                if (ret) {
                    this.dbhandle = ret.handle;
                }

                setImmediate(() => {
                    if (this.db) {
                        this.db.emit('attach', ret);
                    }
                });

                if (callback) {
                    callback(err, ret);
                }
            };
            cb.response = new Database(this);
            this.__queueEvent(this._msg, cb);
        }

        /**
         *
         * @param callback
         * @return {Connection}
         */
        throwClosed(callback) {
            const err = new Error('Connection is closed.');
            this.db.emit('error', err);
            if (callback) {
                callback(err);
            }
            return this;
        }

        /**
         *
         * @param isolation
         * @param callback
         * @return {Connection}
         */
        startTransaction(isolation, callback) {
            if (isolation instanceof Function) {
                callback = isolation;
                isolation = null;
            }

            if (this._isClosed) {
                return this.throwClosed(callback);
            }

            this.beginOperation('startTransaction');
            this.db.emit('transaction', isolation);

            this._msg.pos = 0;
            this._msg.addInt(Const.OP_transaction);
            this._msg.addInt(this.dbhandle);

            this._blr.pos = 0;
            this._blr.addBytes(isolation || Const.ISOLATION_REPEATABLE_READ);
            this._msg.addBlr(this._blr);

            callback.response = new Transaction(this);
            this.__queueEvent(this._msg, callback);
        }

        /**
         *
         * @param transaction
         * @param callback
         * @return {Connection}
         */
        commit(transaction, callback) {
            if (this._isClosed) {
                return this.throwClosed(callback);
            }

            this.beginOperation('commit');
            this.db.emit('commit');

            this._msg.pos = 0;
            this._msg.addInt(Const.OP_commit);
            this._msg.addInt(transaction.handle);

            this.__queueEvent(this._msg, callback);
        }

        /**
         *
         * @param transaction
         * @param callback
         * @return {Connection}
         */
        rollback(transaction, callback) {
            if (this._isClosed) {
                return this.throwClosed(callback);
            }

            this.beginOperation('rollback');
            this.db.emit('rollback');

            this._msg.pos = 0;
            this._msg.addInt(Const.OP_rollback);
            this._msg.addInt(transaction.handle);

            this.__queueEvent(this._msg, callback);
        }

        /**
         *
         * @param transaction
         * @param callback
         * @return {Connection}
         */
        commitRetaining(transaction, callback) {
            if (this._isClosed) {
                return this.throwClosed(callback);
            }

            this.beginOperation('commitRetaining');

            this._msg.pos = 0;
            this._msg.addInt(Const.OP_commit_retaining);
            this._msg.addInt(transaction.handle);

            this.__queueEvent(this._msg, callback);
        }

        /**
         *
         * @param transaction
         * @param callback
         * @return {Connection}
         */
        rollbackRetaining(transaction, callback) {
            if (this._isClosed) {
                return this.throwClosed(callback);
            }

            this.beginOperation('rollbackRetaining');

            this._msg.pos = 0;
            this._msg.addInt(Const.OP_rollback_retaining);
            this._msg.addInt(transaction.handle);

            this.__queueEvent(this._msg, callback);
        }

        /**
         *
         * @param callback
         * @return {Connection}
         */
        allocateStatement(callback) {
            if (this._isClosed) {
                return this.throwClosed(callback);
            }

            this.beginOperation('allocateStatement');

            this._msg.pos = 0;
            this._msg.addInt(Const.OP_allocate_statement);
            this._msg.addInt(this.dbhandle);

            callback.response = new Statement(this);
            this.__queueEvent(this._msg, callback);
        }

        /**
         *
         * @param statement
         * @param callback
         * @return {Connection}
         */
        dropStatement(statement, callback) {
            if (this._isClosed) {
                return this.throwClosed(callback);
            }

            this.beginOperation('dropStatement');

            this._msg.pos = 0;
            this._msg.addInt(Const.OP_free_statement);
            this._msg.addInt(statement.handle);
            this._msg.addInt(Const.DSQL_drop);

            this.__queueEvent(this._msg, callback);
        }

        /**
         *
         * @param statement
         * @param callback
         * @return {Connection}
         */
        closeStatement(statement, callback) {
            if (this._isClosed) {
                return this.throwClosed(callback);
            }

            this.beginOperation('closeStatement');

            this._msg.pos = 0;
            this._msg.addInt(Const.OP_free_statement);
            this._msg.addInt(statement.handle);
            this._msg.addInt(Const.DSQL_close);

            this.__queueEvent(this._msg, callback);
        }

        /**
         *
         * @param transaction
         * @param statement
         * @param query
         * @param plan
         * @param callback
         * @return {Connection}
         */
        prepareStatement(transaction, statement, query, plan, callback) {
            if (this._isClosed) {
                return this.throwClosed(callback);
            }
            if (plan instanceof Function) {
                callback = plan;
                plan = false;
            }

            this._msg.pos = 0;
            this._msg.addInt(Const.OP_prepare_statement);
            this._msg.addInt(transaction.handle);
            this._msg.addInt(statement.handle);
            this._msg.addInt(3); // dialect = 3
            this._msg.addString(query, Const.DEFAULT_ENCODING);

            this._blr.pos = 0;
            this._blr.addBytes(Const.DESCRIBE);
            if (plan) {
                this._blr.addByte(Const.ISC_info_sql_get_plan);
            }
            this._msg.addBlr(this._blr);
            this._msg.addInt(65535); // buffer_length

            this.__queueEvent(this._msg, (err, ret) => {
                if (!err) {
                    __describeStatement(ret, statement);
                    statement.query = query;
                    this.db.emit('query', query);
                    ret = statement;
                    this._setCachedQuery(query, ret);
                }

                if (callback) {
                    callback(err, ret);
                }
            });
        }

        /**
         *
         * @param transaction
         * @param statement
         * @param params
         * @param callback
         * @param custom
         * @return {*}
         */
        executeStatement(transaction, statement, params, callback, custom) {
            if (this._isClosed) {
                return this.throwClosed(callback);
            }
            if (params instanceof Function) {
                callback = params;
                params = undefined;
            }

            this.beginOperation('executeStatement');

            // send different messages if statement has params or not
            if (statement.input.length) {
                if (!Array.isArray(params)) {
                    if (params !== undefined) {
                        params = [params];
                    } else {
                        params = [];
                    }
                }

                if (params === undefined || params.length !== statement.input.length) {
                    this.endOperation();
                    callback(new Error('Expected parameters: (params=' + params.length + ' vs. expected=' + statement.input.length + ') - ' + statement.query));
                    return;
                }

                __prepareStatementParams(this, transaction, params, statement.input, (preparedParams) => {
                    this._msg.pos = 0;

                    this._msg.addInt(Const.OP_execute);
                    this._msg.addInt(statement.handle);
                    this._msg.addInt(transaction.handle);

                    this._blr.pos = 0;
                    __calcBlr(this._blr, preparedParams);
                    this._msg.addBlr(this._blr);

                    this._msg.addInt(0); // message number
                    this._msg.addInt(1); // param count

                    for (let i = 0, length = preparedParams.length; i < length; i++) {
                        preparedParams[i].encode(this._msg);
                    }

                    this.__queueEvent(this._msg, callback);
                });
            } else {
                this._msg.pos = 0;
                this._msg.addInt(Const.OP_execute);
                this._msg.addInt(statement.handle);
                this._msg.addInt(transaction.handle);

                this._blr.pos = 0;
                this._msg.addBlr(this._blr); // empty

                this._msg.addInt(0); // message number
                this._msg.addInt(0); // param count

                this.__queueEvent(this._msg, callback);
            }
        }

        /**
         *
         * @param statement
         * @param transaction
         * @param count
         * @param callback
         */
        fetch(statement, transaction, count, callback) {

            var msg = this._msg;
            var blr = this._blr;

            msg.pos = 0;
            blr.pos = 0;

            if (count instanceof Function) {
                callback = count;
                count = Const.DEFAULT_FETCHSIZE;
            }

            msg.addInt(Const.OP_fetch);
            msg.addInt(statement.handle);
            __calcBlr(blr, statement.output);
            msg.addBlr(blr);
            msg.addInt(0); // message number
            msg.addInt(count || Const.DEFAULT_FETCHSIZE); // fetch count

            callback.transaction = transaction;
            callback.statement = statement;
            this.__queueEvent(this._msg, callback);
        }

        /**
         *
         * @param statement
         * @param transaction
         * @param callback
         */
        fetchAll(statement, transaction, callback) {
            const data = [];
            const loop = (err, ret) => {
                if (err) {
                    callback(err);
                    return;
                }
                const custom = statement.custom;
                const asStream = custom && custom.asStream;

                Utils.doSynchronousLoop(ret.data, (row, i, next) => {
                    if (asStream) {
                        return custom.on(row, i, statement.output, next);
                    } else {
                        data.push(row);
                        next();
                    }
                }, (err) => {
                    if (ret.fetched || err) {
                        callback(err, data);
                    } else {
                        this.fetch(statement, transaction, Const.DEFAULT_FETCHSIZE, loop);
                    }
                });
            };

            this.fetch(statement, transaction, Const.DEFAULT_FETCHSIZE, loop);
        }

        /**
         *
         * @param query
         * @param statement
         * @private
         */
        _setCachedQuery(query, statement) {
            if (this._cache_query) {
                if (this._max_cached_query === -1 || this._max_cached_query > Object.keys(this._cache_query).length) {
                    this._cache_query[query] = statement;
                }
            }
        }

        /**
         *
         * @param query
         * @return {*}
         */
        getCachedQuery(query) {
            if (this._cache_query) {
                return this._cache_query[query];
            }
            return null;
        }

        /**
         *
         * @param blob
         * @param transaction
         * @param callback
         */
        openBlob(blob, transaction, callback) {
            var msg = this._msg;
            msg.pos = 0;
            msg.addInt(Const.OP_open_blob);
            msg.addInt(transaction.handle);
            msg.addQuad(blob);
            this.__queueEvent(this._msg, callback);
        }

        /**
         *
         * @param blob
         * @param callback
         */
        closeBlob(blob, callback) {
            var msg = this._msg;
            msg.pos = 0;
            msg.addInt(Const.OP_close_blob);
            msg.addInt(blob.handle);
            this.__queueEvent(this._msg, callback);
        }

        /**
         *
         * @param blob
         * @param callback
         */
        getSegment(blob, callback) {
            var msg = this._msg;
            msg.pos = 0;
            msg.addInt(Const.OP_get_segment);
            msg.addInt(blob.handle);
            msg.addInt(1024); // buffer length
            msg.addInt(0); // ???
            this.__queueEvent(this._msg, callback);
        }

        /**
         *
         * @param transaction
         * @param callback
         */
        createBlob2(transaction, callback) {
            var msg = this._msg;
            msg.pos = 0;
            msg.addInt(Const.OP_create_blob2);
            msg.addInt(0);
            msg.addInt(transaction.handle);
            msg.addInt(0);
            msg.addInt(0);
            this.__queueEvent(this._msg, callback);
        }

        /**
         *
         * @param blob
         * @param buffer
         * @param callback
         */
        batchSegments(blob, buffer, callback) {
            var msg = this._msg;
            var blr = this._blr;
            msg.pos = 0;
            blr.pos = 0;
            msg.addInt(Const.OP_batch_segments);
            msg.addInt(blob.handle);
            msg.addInt(buffer.length + 2);
            blr.addBuffer(buffer);
            msg.addBlr(blr);
            this.__queueEvent(this._msg, callback);
        }

        /**
         *
         * @param operation
         */
        beginOperation(operation) {
            this._pending.push(operation);
        }

        /**
         *
         */
        endOperation() {
            this._pending.pop();
        }

        /**
         *
         * @return {boolean}
         */
        inOperation() {
            return this._pending.length > 0;
        }

        queEvents(events, eventid, callback) {
            if (this._isClosed) {
                return this.throwClosed(callback);
            }
            var msg = this._msg;
            var blr = this._blr;
            blr.pos = 0;
            msg.pos = 0;
            msg.addInt(Const.OP_que_events);
            msg.addInt(this.dbhandle);
            // prepare EPB
            blr.addByte(Const.EPB_version1);
            for (let event of events) {
                const event_buffer = new Buffer(event, 'UTF8');
                blr.addByte(event_buffer.length);
                blr.addBytes(event_buffer);
                blr.addInt32(events[event]);
            }
            msg.addBlr(blr);    // epb
            msg.addInt(0);    // ast
            msg.addInt(0);   // args
            msg.addInt(eventid);
            this.__queueEvent(this._msg, callback);
        }

        connectRequest(callback) {
            if (this._isClosed) {
                return this.throwClosed(callback);
            }
            var msg = this._msg;
            msg.pos = 0;
            msg.addInt(Const.OP_connect_request);
            msg.addInt(1); // async
            msg.addInt(this.dbhandle);
            msg.addInt(0);
            function cb(err, ret) {
                if (err) {
                    Utils.doError(err, callback);
                    return;
                }

                const socket_info = {
                    family: ret.buffer.readInt16BE(0),
                    port: ret.buffer.readUInt16BE(2),
                    host: ret.buffer.readUInt8(4) + '.' + ret.buffer.readUInt8(5) + '.' + ret.buffer.readUInt8(6) + '.' + ret.buffer.readUInt8(7)
                };
                Utils.doCallback(socket_info, callback);
            }

            this.__queueEvent(this._msg, cb);
        }

        closeEvents(eventid, callback) {
            if (this._isClosed) {
                return this.throwClosed(callback);
            }
            var msg = this._msg;
            msg.pos = 0;
            msg.addInt(Const.OP_cancel_events);
            msg.addInt(this.dbhandle);
            msg.addInt(eventid);

            function cb(err, ret) {
                if (err) {
                    Utils.doError(err, callback);
                    return;
                }

                callback(err);
            }

            this.__queueEvent(this._msg, cb);
        }

        __queueEvent(message, callback) {
            if (this._isClosed) {
                if (callback) {
                    callback(new Error('Connection is closed.'));
                }
                return;
            }

            this._queue.push(callback);
            this._socket.write(message.getData());
        }
    }

    module.exports = Connection;

    function __onConnectionConnect(connection, connectionCallback) {
        connection._isClosed = false;
        connection._isOpened = true;
        if (connectionCallback) {
            connectionCallback();
        }
    }

    function __onConnectionClose(connection, connectionCallback) {
        connection._isClosed = true;

        if (connection._isDetach) {
            return;
        }

        if (!connection.db) {
            Utils.doError(connection.error, connectionCallback);
            return;
        }

        if (connection.db.maxtryreconnect > 0) {
            setImmediate(() => __reconnect(connection));
        } else {
            connection.db.emit('destroy', false);
        }
    }

    function __onConnectionError(connection, error) {
        connection.error = error;

        if (connection.db) {
            connection.db.emit('error', error);
        }
    }

    function __onConnectionData(connection, data) {
        // Create new xdr reader, or take one from previous partial read
        let xdr;
        if (!connection.partialXdr) {
            xdr = new Serialize.XdrReader(data);
        } else {
            xdr = connection.partialXdr;
            xdr.buffer = Buffer.concat([xdr.buffer, data]);
            delete connection.partialXdr;
        }

        // Read all buffer
        while (xdr.pos < xdr.buffer.length) {
            const xdrPos = xdr.pos;
            const callback = connection._queue[0];

            let response;
            try {
                response = __decodeResponse(xdr, callback, connection._lowercase_keys);
                if (response && response.partial) {
                    // packet is not complete
                    xdr.buffer = xdr.buffer.slice(xdr.pos);
                    xdr.pos = 0;
                    connection.partialXdr = xdr;
                    return;
                }

                // remove the op flag, needed for partial packet
                if (xdr.partialResponseType) {
                    delete xdr.partialResponseType;
                }
            } catch (e) {
                if (e instanceof RangeError) {
                    xdr.buffer = xdr.buffer.slice(xdrPos);
                    xdr.pos = 0;
                    connection.partialXdr = xdr;
                    return;
                }
                return Utils.doCallback(e, callback);
            }

            connection._queue.shift();
            connection._pending.shift();

            if (response && response.status) {
                Messages.lookupMessages(response.status, (message) => {
                    response.message = message;
                    Utils.doCallback(response, callback);
                });
            } else {
                Utils.doCallback(response, callback);
            }
        }

        // If requested, set timer for auto disconnect
        if (connection._detachAuto && !connection.inOperation()) {
            clearTimeout(connection._detachTimeout);
            connection._detachTimeout = setTimeout(() => {
                connection.db.detach(connection._detachCallback);
                connection._detachAuto = false;
            }, 100);
        }
    }

    function __decodeResponse(xdr, callback, lowercase_keys) {
        // We can get "response type" from previous partial packet read, or from current packet
        // + eat all dummy symbols from the start of response
        let responseType;
        do {
            responseType = xdr.partialResponseType || xdr.readInt();
        } while (responseType === Const.OP_dummy);

        // Act differently on response type
        switch (responseType) {
            case Const.OP_response:
                return __decodeSimpleResponse(xdr, callback);

            case Const.OP_fetch_response:
                return __decodeFetchResponse(xdr, callback, lowercase_keys);

            case Const.OP_accept:
                const protocolVersion = xdr.readInt();
                const architecture = xdr.readInt();
                const type = xdr.readInt();
                if (protocolVersion !== Const.PROTOCOL_VERSION10 ||
                    architecture !== Const.ARCHITECTURE_GENERIC ||
                    type !== Const.PTYPE_batch_send) {
                    throw new Error('Invalid connect result');
                }
                return {};

            default:
                throw new Error('Unexpected response: ' + responseType);
        }
    }

    function __decodeSimpleResponse(xdr, callback) {
        const response = callback && callback.response || {};

        const xdrPos = xdr.pos;
        try {
            response.handle = xdr.readInt();
            const oid = xdr.readQuad();
            if (oid.low || oid.high) {
                response.oid = oid;
            }

            const buf = xdr.readArray();
            if (buf) {
                response.buffer = buf;
            }

            let num, item;
            while (true) {
                const op = xdr.readInt();
                switch (op) {
                    case Const.ISC_arg_end:
                        return response;

                    case Const.ISC_arg_gds:
                        num = xdr.readInt();
                        if (!num) {
                            break;
                        }

                        if (!response.status) {
                            response.status = [];
                        }
                        item = {gdscode: num};
                        response.status.push(item);
                        break;

                    case Const.ISC_arg_string:
                    case Const.ISC_arg_interpreted:
                    case Const.ISC_arg_sql_state:
                        if (!item.params) {
                            item.params = [];
                        }
                        const str = xdr.readString(Const.DEFAULT_ENCODING);
                        item.params.push(str);
                        break;

                    case Const.ISC_arg_number:
                        if (!item.params) {
                            item.params = [];
                        }
                        num = xdr.readInt();
                        item.params.push(num);

                        if (item.gdscode === Const.ISC_sqlerr) {
                            response.sqlcode = num;
                        }
                        break;

                    default:
                        throw new Error('Unexpected: ' + op);
                }
            }
        } catch (e) {
            if (e instanceof RangeError) {
                xdr.pos = xdrPos;
                xdr.partialResponseType = Const.OP_response;
                return {partial: true};
            }
            throw e;
        }
    }

    function __decodeFetchResponse(xdr, callback, lowercase_keys) {
        const RESULT_SET_EXHAUSTED = 100;
        let xdrPos = 0;

        const statement = callback.statement;
        const transaction = callback.transaction;
        const output = statement.output;
        const custom = statement.custom || {};
        statement.nbrowsfetched = statement.nbrowsfetched || 0;

        // Could be set when a packet is not complete
        if (xdr.fop) {
            xdr.readInt(); // eat "response type" bytes
            xdr.fop = false;
        }

        xdr.fcolumn = xdr.fcolumn || 0;
        xdr.frow = xdr.frow || (custom.asObject ? {} : new Array(output.length));
        xdr.frows = xdr.frows || [];

        if (custom.asObject && !xdr.fcols) {
            xdr.fcols = [];
            for (let i = 0, length = output.length; i < length; i++) {
                xdr.fcols.push(lowercase_keys ? output[i].alias.toLowerCase() : output[i].alias);
            }
        }

        // Take previous partial packet row params or read first row params from current packet
        xdr.fstatus = xdr.fstatus !== undefined ? xdr.fstatus : xdr.readInt();
        xdr.fcount = xdr.fcount !== undefined ? xdr.fcount : xdr.readInt();

        while (xdr.fcount && (xdr.fstatus !== RESULT_SET_EXHAUSTED)) {
            // Read all columns data for current row
            for (let length = output.length; xdr.fcolumn < length; xdr.fcolumn++) {
                // Remember position before reading next column value
                xdrPos = xdr.pos;

                const item = output[xdr.fcolumn];
                try {
                    let value = item.decode(xdr);
                    if (custom.asObject) {
                        if (item.type === Const.SQL_BLOB) {
                            value = Blob.createBlobAsyncReader(statement, transaction, value, xdr.fcols[xdr.fcolumn]);
                        }
                        xdr.frow[xdr.fcols[xdr.fcolumn]] = value;
                    }
                    else {
                        if (item.type === Const.SQL_BLOB) {
                            value = Blob.createBlobAsyncReader(statement, transaction, value, xdr.fcolumn);
                        }
                        xdr.frow[xdr.fcolumn] = value;
                    }
                } catch (e) {
                    // Packet breaks in column read - uncomplete packet read
                    xdr.pos = xdrPos;
                    xdr.partialResponseType = Const.OP_fetch_response;
                    return {partial: true};
                }

            }

            // Collect or stream read row
            statement.connection.db.emit('row', xdr.frow, statement.nbrowsfetched, custom.asObject);
            if (!custom.asStream) {
                xdr.frows.push(xdr.frow);
            }
            if (custom.on) {
                custom.on(xdr.frow, statement.nbrowsfetched, output);
            }

            xdr.fcolumn = 0;
            xdr.frow = custom.asObject ? {} : new Array(output.length);

            try {
                delete xdr.fstatus;
                delete xdr.fcount;
                xdrPos = xdr.pos;

                // Read next row params
                xdr.readInt(); // eat "operation type" bytes
                xdr.fstatus = xdr.readInt();
                xdr.fcount = xdr.readInt();
            } catch (e) {
                // Packet breaks between rows column read - uncomplete packet read
                if (xdrPos === xdr.pos) {
                    xdr.fop = true;
                }
                xdr.partialResponseType = Const.OP_fetch_response;
                return {partial: true};
            }
            statement.nbrowsfetched++;
        }

        statement.connection.db.emit('result', xdr.frows);
        return {
            data: xdr.frows,
            fetched: Boolean(xdr.fstatus === RESULT_SET_EXHAUSTED)
        };
    }

    function __reconnect(connection) {
        connection.db.maxtryreconnect--;
        connection._socket = null;
        connection._msg = null;
        connection._blr = null;

        const newConnection = new Connection(connection.host, connection.port, (err) => {
            newConnection.connect(connection.options.filename, (err) => {

                if (err) {
                    connection.emit('error', err);
                    return;
                }

                newConnection.attach(connection.options, (err) => {

                    if (err) {
                        connection.emit('error', err);
                        return;
                    }

                    newConnection._queue = newConnection._queue.concat(connection._queue);
                    newConnection._pending = newConnection._pending.concat(connection._pending);
                    connection.db.emit('reconnect');

                }, connection.db);
            });

        }, connection.options, connection.db);
    }

    function __calcBlr(blr, xsqlda) {
        blr.addBytes([Const.BLR_version5, Const.BLR_begin, Const.BLR_message, 0]); // + message number
        blr.addWord(xsqlda.length * 2);

        for (let i = 0, length = xsqlda.length; i < length; i++) {
            xsqlda[i].calcBlr(blr);
            blr.addByte(Const.BLR_short);
            blr.addByte(0);
        }

        blr.addByte(Const.BLR_end);
        blr.addByte(Const.BLR_eoc);
    }

    function __describeStatement(ret, statement) {
        const br = new Serialize.BlrReader(ret.buffer);
        let parameters = null;

        while (br.pos < br.buffer.length) {
            switch (br.readByteCode()) {
                case Const.ISC_info_sql_stmt_type:
                    statement.type = br.readInt();
                    break;

                case Const.ISC_info_sql_get_plan:
                    statement.plan = br.readString(Const.DEFAULT_ENCODING);
                    break;

                case Const.ISC_info_sql_select:
                    statement.output = parameters = [];
                    break;

                case Const.ISC_info_sql_bind:
                    statement.input = parameters = [];
                    break;

                case Const.ISC_info_sql_num_variables:
                    br.readInt(); // eat int
                    break;

                case Const.ISC_info_sql_describe_vars:
                    if (!parameters) {
                        return;
                    }

                    br.readInt(); // eat int ?
                    __describeSqlVars(br, parameters);
            }
        }
    }

    function __describeSqlVars(br, parameters) {
        var finishDescribe = false,
            type,
            sqlVar = null,
            num;

        while (!finishDescribe) {
            switch (br.readByteCode()) {
                case Const.ISC_info_sql_describe_end:
                    break;

                case Const.ISC_info_sql_sqlda_seq:
                    num = br.readInt();
                    break;

                case Const.ISC_info_sql_type:
                    type = br.readInt();
                    sqlVar = Fields.createSQLVar(type);
                    parameters[num - 1] = sqlVar;
                    sqlVar.type = type;
                    sqlVar.nullable = Boolean(sqlVar.type & 1);
                    sqlVar.type &= ~1;
                    break;

                case Const.ISC_info_sql_sub_type:
                    sqlVar.subType = br.readInt();
                    break;

                case Const.ISC_info_sql_scale:
                    sqlVar.scale = br.readInt();
                    break;

                case Const.ISC_info_sql_length:
                    sqlVar.length = br.readInt();
                    break;

                case Const.ISC_info_sql_null_ind:
                    sqlVar.nullable = Boolean(br.readInt());
                    break;

                case Const.ISC_info_sql_field:
                    sqlVar.field = br.readString(Const.DEFAULT_ENCODING);
                    break;

                case Const.ISC_info_sql_relation:
                    sqlVar.relation = br.readString(Const.DEFAULT_ENCODING);
                    break;

                case Const.ISC_info_sql_owner:
                    sqlVar.owner = br.readString(Const.DEFAULT_ENCODING);
                    break;

                case Const.ISC_info_sql_alias:
                    sqlVar.alias = br.readString(Const.DEFAULT_ENCODING);
                    break;

                case Const.ISC_info_sql_relation_alias:
                    sqlVar.relationAlias = br.readString(Const.DEFAULT_ENCODING);
                    break;

                case Const.ISC_info_truncated:
                    throw new Error('Truncated');

                default:
                    finishDescribe = true;
                    br.pos--;
            }
        }
    }

    function __prepareStatementParams(connection, transaction, params, input, callback) {
        var value, meta;
        var ret = new Array(params.length);
        var wait = params.length;

        function done() {
            wait--;
            if (wait === 0) {
                callback(ret);
            }
        }

        function putBlobData(index, value, callback) {

            connection.createBlob2(transaction, (err, blob) => {
                const isStream = value.readable;

                let buffer;
                if (Buffer.isBuffer(value)) {
                    buffer = value;
                } else if (typeof(value) === 'string') {
                    buffer = new Buffer(value, Const.DEFAULT_ENCODING);
                } else if (!isStream) {
                    buffer = new Buffer(JSON.stringify(value), Const.DEFAULT_ENCODING);
                }

                if (Buffer.isBuffer(buffer)) {
                    __bufferReader(buffer, 1024,
                        (b, next) => connection.batchSegments(blob, b, next),
                        () => {
                            ret[index] = Fields.createQuadSQLParam(blob.oid);
                            connection.closeBlob(blob, callback);
                        });
                    return;
                }

                let isReading = false;
                let isEnd = false;

                value.on('data', (chunk) => {
                    value.pause();
                    isReading = true;
                    __bufferReader(chunk, 1024,
                        (b, next) => connection.batchSegments(blob, b, next),
                        () => {
                            isReading = false;

                            if (isEnd) {
                                ret[index] = Fields.createQuadSQLParam(blob.oid);
                                connection.closeBlob(blob, callback);
                            } else {
                                value.resume();
                            }
                        });
                });

                value.on('end', () => {
                    isEnd = true;
                    if (isReading) {
                        return;
                    }
                    ret[index] = Fields.createQuadSQLParam(blob.oid);
                    connection.closeBlob(blob, callback);
                });
            });
        }

        for (let i = 0, length = params.length; i < length; i++) {
            value = params[i];
            meta = input[i];

            // If creating not null blob param
            if (meta.type === Const.SQL_BLOB && value != null) {
                putBlobData(i, value, done);
            } else if (value == null) { // if value is 'null' or 'undefined'
                ret[i] = Fields.createNullSQLParam(meta.type);
                done();
            } else {
                ret[i] = Fields.createSQLParam(value, meta.type);
                done();
            }
        }
    }

    function __bufferReader(buffer, max, writer, cb, beg, end) {
        beg = beg || 0;
        end = end || max;

        if (end >= buffer.length) {
            end = undefined;
        }

        const b = buffer.slice(beg, end);
        writer(b, () => {
            if (end === undefined) {
                cb();
                return;
            }

            __bufferReader(buffer, max, writer, cb, beg + max, end + max);
        });
    }
})();