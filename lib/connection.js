(function () {
    'use strict';

    var net = require('net');
    var os = require('os');
    var Events = require('events');

    var Database = require('./database');
    var Statement = require('./statement');
    var Transaction = require('./transaction');
    var Fields = require('./fields');
    var Messages = require('./messages.js');
    var Serialize = require('./serialize.js');
    var ServiceManager = require('./serviceManager');
    var Utils = require('./utils');
    var Const = require('./const');

    module.exports = Connection;

    // Defaults
    var MAX_BUFFER_SIZE = 8192;
    var DEFAULT_USER = 'SYSDBA';
    var DEFAULT_PASSWORD = 'masterkey';
    var DEFAULT_PAGE_SIZE = 4096;
    var DEFAULT_SVC_NAME = 'service_mgr';

    /**
     *
     * @param host
     * @param port
     * @param callback
     * @param options
     * @param db
     * @param svc
     * @constructor
     */
    function Connection(host, port, callback, options, db, svc) {
        this.db = db;
        this.svc = svc;
        this.host = host;
        this.port = port;
        this._msg = new Serialize.XdrWriter(32);
        this._blr = new Serialize.BlrWriter(32);
        this._queue = [];
        // TODO this._detachTimeout;
        this._detachCallback = null;
        this._detachAuto = false;
        this._socket = net.createConnection(port, host);
        this._pending = [];
        this._isClosed = false;
        this._isDetach = false;
        this._isUsed = false;
        this._pooled = options.isPool || false;
        this._max_cached_query = options.maxCachedQuery || -1;
        this._cache_query = options.cacheQuery ? {} : null;
        this.options = options;

        bindEvents(this, callback);
        // TODO this.error;
    }

    Connection.prototype.disconnect = function () {
        this._socket.end();
    };

    Connection.prototype.connect = function (database, callback) {

        var msg = this._msg;
        var blr = this._blr;

        msg.pos = 0;
        blr.pos = 0;

        msg.addInt(Const.OP_connect);
        msg.addInt(Const.OP_attach);
        msg.addInt(Const.CONNECT_VERSION2);
        msg.addInt(Const.ARCHITECTURE_GENERIC);
        msg.addString(database || '', Const.DEFAULT_ENCODING);
        msg.addInt(1);  // Protocol version understood count.

        blr.addString(1, 'Unknown', Const.DEFAULT_ENCODING);
        var hostname = os.hostname();
        blr.addString(4, hostname, Const.DEFAULT_ENCODING);
        blr.addBytes([6, 0]);
        msg.addBlr(this._blr);

        msg.addInt(Const.PROTOCOL_VERSION10);
        msg.addInt(Const.ARCHITECTURE_GENERIC);
        msg.addInt(2);  // Min type
        msg.addInt(3);  // Max type
        msg.addInt(2);  // Preference weight

        queueEvent(this, callback);
    };

    Connection.prototype.attach = function (options, callback, db) {
        var self = this;
        var database = options.database || options.filename;
        var user = options.user || DEFAULT_USER;
        var password = options.password || DEFAULT_PASSWORD;
        var role = options.role;
        var msg = this._msg;
        var blr = this._blr;
        msg.pos = 0;
        blr.pos = 0;

        blr.addByte(1);
        blr.addString(Const.ISC_dpb_lc_ctype, 'UTF8', Const.DEFAULT_ENCODING);
        blr.addString(Const.ISC_dpb_user_name, user, Const.DEFAULT_ENCODING);
        blr.addString(Const.ISC_dpb_password, password, Const.DEFAULT_ENCODING);

        if (role) {
            blr.addString(Const.ISC_dpb_sql_role_name, role, Const.DEFAULT_ENCODING);
        }

        msg.addInt(Const.OP_attach);
        msg.addInt(0);  // Database Object ID
        msg.addString(database, Const.DEFAULT_ENCODING);
        msg.addBlr(this._blr);

        function cb(err, ret) {

            if (err) {
                Utils.doError(err, callback);
                return;
            }

            self.dbhandle = ret.handle;
            if (callback) {
                callback(undefined, ret);
            }
        }

        // For reconnect
        if (db) {
            db.connection = this;
            cb.response = db;
        } else {
            cb.response = new Database(this);
            cb.response.removeAllListeners('error');
            cb.response.on('error', Utils.noop);
        }

        queueEvent(this, cb);
    };

    Connection.prototype.detach = function (callback) {

        var self = this;

        if (self._isClosed) {
            return;
        }

        self._isUsed = false;
        self._isDetach = true;

        var msg = self._msg;

        msg.pos = 0;
        msg.addInt(Const.OP_detach);
        msg.addInt(0); // Database Object ID

        queueEvent(self, function (err, ret) {
            delete(self.dbhandle);
            if (callback) {
                callback(err, ret);
            }
        });
    };

    Connection.prototype.createDatabase = function (options, callback) {

        var database = options.database || options.filename;
        var user = options.user || DEFAULT_USER;
        var password = options.password || DEFAULT_PASSWORD;
        var pageSize = options.pageSize || DEFAULT_PAGE_SIZE;
        var role = options.role;
        var blr = this._blr;

        blr.pos = 0;
        blr.addByte(1);
        blr.addString(Const.ISC_dpb_set_db_charset, 'UTF8', Const.DEFAULT_ENCODING);
        blr.addString(Const.ISC_dpb_lc_ctype, 'UTF8', Const.DEFAULT_ENCODING);
        blr.addString(Const.ISC_dpb_user_name, user, Const.DEFAULT_ENCODING);
        blr.addString(Const.ISC_dpb_password, password, Const.DEFAULT_ENCODING);

        if (role) {
            blr.addString(Const.ISC_dpb_sql_role_name, role, Const.DEFAULT_ENCODING);
        }

        blr.addNumeric(Const.ISC_dpb_sql_dialect, 3);
        blr.addNumeric(Const.ISC_dpb_force_write, 1);
        blr.addNumeric(Const.ISC_dpb_page_size, pageSize);

        var msg = this._msg;
        msg.pos = 0;
        msg.addInt(Const.OP_create);  // op_create
        msg.addInt(0);          // Database Object ID
        msg.addString(database, Const.DEFAULT_ENCODING);
        msg.addBlr(blr);

        var self = this;

        function cb(err, ret) {
            if (ret) {
                self.dbhandle = ret.handle;
            }

            setImmediate(function () {
                if (self.db) {
                    self.db.emit('attach', ret);
                }
            });

            if (callback) {
                callback(err, ret);
            }
        }

        cb.response = new Database(this);
        queueEvent(this, cb);
    };

    Connection.prototype.throwClosed = function (callback) {
        var err = new Error('Connection is closed.');
        this.db.emit('error', err);
        if (callback) {
            callback(err);
        }
        return this;
    };

    Connection.prototype.startTransaction = function (isolation, callback) {

        if (typeof(isolation) === 'function') {
            var tmp = isolation;
            isolation = callback;
            callback = tmp;
        }

        if (this._isClosed) {
            return this.throwClosed(callback);
        }

        this.beginOperation('startTransaction');

        var blr = this._blr;
        var msg = this._msg;

        blr.pos = 0;
        msg.pos = 0;

        if (isolation instanceof Function) {
            callback = isolation;
            isolation = null;
        }

        blr.addBytes(isolation || Const.ISOLATION_REPEATABLE_READ);
        msg.addInt(Const.OP_transaction);
        msg.addInt(this.dbhandle);
        msg.addBlr(blr);
        callback.response = new Transaction(this);

        this.db.emit('transaction', isolation);
        queueEvent(this, callback);
    };

    Connection.prototype.commit = function (transaction, callback) {
        if (this._isClosed) {
            return this.throwClosed(callback);
        }

        this.beginOperation('commit');

        var msg = this._msg;
        msg.pos = 0;
        msg.addInt(Const.OP_commit);
        msg.addInt(transaction.handle);
        this.db.emit('commit');
        queueEvent(this, callback);
    };

    Connection.prototype.rollback = function (transaction, callback) {
        if (this._isClosed) {
            return this.throwClosed(callback);
        }

        this.beginOperation('rollback');

        var msg = this._msg;
        msg.pos = 0;
        msg.addInt(Const.OP_rollback);
        msg.addInt(transaction.handle);
        this.db.emit('rollback');
        queueEvent(this, callback);
    };

    Connection.prototype.commitRetaining = function (transaction, callback) {
        if (this._isClosed) {
            return this.throwClosed(callback);
        }

        this.beginOperation('commitRetaining');

        var msg = this._msg;
        msg.pos = 0;
        msg.addInt(Const.OP_commit_retaining);
        msg.addInt(transaction.handle);
        queueEvent(this, callback);
    };

    Connection.prototype.rollbackRetaining = function (transaction, callback) {

        if (this._isClosed) {
            return this.throwClosed(callback);
        }

        this.beginOperation('rollbackRetaining');

        var msg = this._msg;
        msg.pos = 0;
        msg.addInt(Const.OP_rollback_retaining);
        msg.addInt(transaction.handle);
        queueEvent(this, callback);
    };

    Connection.prototype.allocateStatement = function (callback) {

        if (this._isClosed) {
            return this.throwClosed(callback);
        }

        this.beginOperation('allocateStatement');

        var msg = this._msg;
        msg.pos = 0;
        msg.addInt(Const.OP_allocate_statement);
        msg.addInt(this.dbhandle);
        callback.response = new Statement(this);
        queueEvent(this, callback);
    };

    Connection.prototype.dropStatement = function (statement, callback) {

        if (this._isClosed) {
            return this.throwClosed(callback);
        }

        this.beginOperation('dropStatement');

        var msg = this._msg;
        msg.pos = 0;
        msg.addInt(Const.OP_free_statement);
        msg.addInt(statement.handle);
        msg.addInt(Const.DSQL_drop);
        queueEvent(this, callback);
    };

    Connection.prototype.closeStatement = function (statement, callback) {

        if (this._isClosed) {
            return this.throwClosed(callback);
        }

        this.beginOperation('closeStatement');

        var msg = this._msg;
        msg.pos = 0;
        msg.addInt(Const.OP_free_statement);
        msg.addInt(statement.handle);
        msg.addInt(Const.DSQL_close);
        queueEvent(this, callback);
    };

    Connection.prototype.prepareStatement = function (transaction, statement, query, plan, callback) {

        if (this._isClosed) {
            return this.throwClosed(callback);
        }

        var msg = this._msg;
        var blr = this._blr;

        msg.pos = 0;
        blr.pos = 0;

        if (plan instanceof Function) {
            callback = plan;
            plan = false;
        }

        blr.addBytes(Const.DESCRIBE);

        if (plan) {
            blr.addByte(Const.ISC_info_sql_get_plan);
        }

        msg.addInt(Const.OP_prepare_statement);
        msg.addInt(transaction.handle);
        msg.addInt(statement.handle);
        msg.addInt(3); // dialect = 3
        msg.addString(query, Const.DEFAULT_ENCODING);
        msg.addBlr(blr);
        msg.addInt(65535); // buffer_length

        var self = this;

        queueEvent(this, function (err, ret) {

            if (!err) {
                describeStatement(ret, statement);
                statement.query = query;
                self.db.emit('query', query);
                ret = statement;
                self._setCachedQuery(query, ret);
            }

            if (callback) {
                callback(err, ret);
            }
        });

    };

    Connection.prototype.executeStatement = function (transaction, statement, params, callback, custom) {

        if (this._isClosed) {
            return this.throwClosed(callback);
        }

        this.beginOperation('executeStatement');

        if (params instanceof Function) {
            callback = params;
            params = undefined;
        }

        var self = this;

        var input = statement.input;

        if (input.length) {

            if (!(params instanceof Array)) {
                if (params !== undefined) {
                    params = [params];
                } else {
                    params = [];
                }
            }

            if (params === undefined || params.length !== input.length) {
                self.endOperation();
                callback(new Error('Expected parameters: (params=' + params.length + ' vs. expected=' + input.length + ') - ' + statement.query));
                return;
            }

            prepareStatementParams(self, transaction, params, input, function (prms) {

                var msg = self._msg;
                var blr = self._blr;
                msg.pos = 0;
                blr.pos = 0;
                calcBlr(blr, prms);

                msg.addInt(Const.OP_execute);
                msg.addInt(statement.handle);
                msg.addInt(transaction.handle);
                msg.addBlr(blr);
                msg.addInt(0); // message number
                msg.addInt(1); // param count

                for (var i = 0, length = prms.length; i < length; i++) {
                    prms[i].encode(msg);
                }

                queueEvent(self, callback);
            });

            return;
        }

        var msg = this._msg;
        var blr = this._blr;
        msg.pos = 0;
        blr.pos = 0;

        msg.addInt(Const.OP_execute);
        msg.addInt(statement.handle);
        msg.addInt(transaction.handle);

        msg.addBlr(blr); // empty
        msg.addInt(0); // message number
        msg.addInt(0); // param count

        queueEvent(this, callback);
    };

    Connection.prototype.fetch = function (statement, transaction, count, callback) {

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
        calcBlr(blr, statement.output);
        msg.addBlr(blr);
        msg.addInt(0); // message number
        msg.addInt(count || Const.DEFAULT_FETCHSIZE); // fetch count

        if (!transaction) {
            callback.statement = statement;
            queueEvent(this, callback);
            return;
        }

        callback.statement = statement;
        queueEvent(this, callback);
    };

    Connection.prototype.fetchAll = function (statement, transaction, callback) {

        var self = this;
        var data;
        var loop = function (err, ret) {

            if (err) {
                callback(err);
                return;
            }

            if (!data) {
                data = ret.data;
            } else {
                for (var i = 0, length = ret.data.length; i < length; i++) {
                    data.push(ret.data[i]);
                }
            }

            if (ret.fetched) {
                callback(undefined, data);
            } else {
                self.fetch(statement, transaction, Const.DEFAULT_FETCHSIZE, loop);
            }
        };

        this.fetch(statement, transaction, Const.DEFAULT_FETCHSIZE, loop);
    };

    Connection.prototype._setCachedQuery = function (query, statement) {
        if (this._cache_query) {
            if (this._max_cached_query === -1 || this._max_cached_query > Object.keys(this._cache_query).length) {
                this._cache_query[query] = statement;
            }
        }
    };

    Connection.prototype.getCachedQuery = function (query) {
        if (this._cache_query) {
            return this._cache_query[query];
        }
        return null;
    };

    Connection.prototype.openBlob = function (blob, transaction, callback) {
        var msg = this._msg;
        msg.pos = 0;
        msg.addInt(Const.OP_open_blob);
        msg.addInt(transaction.handle);
        msg.addQuad(blob);
        queueEvent(this, callback);
    };

    Connection.prototype.closeBlob = function (blob, callback) {
        var msg = this._msg;
        msg.pos = 0;
        msg.addInt(Const.OP_close_blob);
        msg.addInt(blob.handle);
        queueEvent(this, callback);
    };

    Connection.prototype.getSegment = function (blob, callback) {
        var msg = this._msg;
        msg.pos = 0;
        msg.addInt(Const.OP_get_segment);
        msg.addInt(blob.handle);
        msg.addInt(1024); // buffer length
        msg.addInt(0); // ???
        queueEvent(this, callback);
    };

    Connection.prototype.createBlob2 = function (transaction, callback) {
        var msg = this._msg;
        msg.pos = 0;
        msg.addInt(Const.OP_create_blob2);
        msg.addInt(0);
        msg.addInt(transaction.handle);
        msg.addInt(0);
        msg.addInt(0);
        queueEvent(this, callback);
    };

    Connection.prototype.batchSegments = function (blob, buffer, callback) {
        var msg = this._msg;
        var blr = this._blr;
        msg.pos = 0;
        blr.pos = 0;
        msg.addInt(Const.OP_batch_segments);
        msg.addInt(blob.handle);
        msg.addInt(buffer.length + 2);
        blr.addBuffer(buffer);
        msg.addBlr(blr);
        queueEvent(this, callback);
    };

    Connection.prototype.beginOperation = function (operation) {
        this._pending.push(operation);
    };

    Connection.prototype.endOperation = function () {
        this._pending.pop();
    };

    Connection.prototype.inOperation = function () {
        return this._pending.length > 0;
    };

    Connection.prototype.svcattach = function (options, callback, svc) {
        var self = this;

        var user = options.user || DEFAULT_USER;
        var password = options.password || DEFAULT_PASSWORD;
        var role = options.role;
        var msg = this._msg;
        var blr = this._blr;
        msg.pos = 0;
        blr.pos = 0;

        blr.addBytes([
            Const.ISC_dpb_version2, Const.ISC_dpb_version2
        ]);
        blr.addString(Const.ISC_dpb_lc_ctype, 'UTF8', Const.DEFAULT_ENCODING);
        blr.addString(Const.ISC_dpb_user_name, user, Const.DEFAULT_ENCODING);
        blr.addString(Const.ISC_dpb_password, password, Const.DEFAULT_ENCODING);
        blr.addByte(Const.ISC_dpb_dummy_packet_interval);
        blr.addByte(4);
        blr.addBytes([120, 10, 0, 0]); // FROM DOT NET PROVIDER
        if (role) {
            blr.addString(Const.ISC_dpb_sql_role_name, role, Const.DEFAULT_ENCODING);
        }

        msg.addInt(Const.OP_service_attach);
        msg.addInt(0);
        msg.addString(DEFAULT_SVC_NAME, Const.DEFAULT_ENCODING); // only local for moment
        msg.addBlr(this._blr);

        function cb(err, ret) {

            if (err) {
                Utils.doError(err, callback);
                return;
            }

            self.svchandle = ret.handle;
            if (callback) {
                callback(undefined, ret);
            }
        }

        // For reconnect
        if (svc) {
            svc.connection = this;
            cb.response = svc;
        } else {
            cb.response = new ServiceManager(this);
            cb.response.removeAllListeners('error');
            cb.response.on('error', Utils.noop);
        }

        queueEvent(this, cb);
    };

    Connection.prototype.svcstart = function (spbaction, callback) {
        var msg = this._msg;
        msg.pos = 0;
        msg.addInt(Const.OP_service_start);
        msg.addInt(this.svchandle);
        msg.addInt(0);
        msg.addBlr(spbaction);
        queueEvent(this, callback);
    };

    Connection.prototype.svcquery = function (spbquery, resultbuffersize, timeout, callback) {
        if (resultbuffersize > MAX_BUFFER_SIZE) {
            Utils.doError(new Error('Buffer is too big'), callback);
            return;
        }

        var msg = this._msg;
        var blr = this._blr;
        msg.pos = 0;
        blr.pos = 0;
        blr.addByte(Const.ISC_spb_current_version);
        //blr.addByteInt32(Const.ISC_info_svc_timeout, timeout);
        msg.addInt(Const.OP_service_info);
        msg.addInt(this.svchandle);
        msg.addInt(0);
        msg.addBlr(blr);
        blr.pos = 0;
        blr.addBytes(spbquery);
        msg.addBlr(blr);
        msg.addInt(resultbuffersize);
        queueEvent(this, callback);
    };

    Connection.prototype.svcdetach = function (callback) {
        var self = this;

        if (self._isClosed) {
            return;
        }

        self._isUsed = false;
        self._isDetach = true;

        var msg = self._msg;

        msg.pos = 0;
        msg.addInt(Const.OP_service_detach);
        msg.addInt(this.svchandle); // Database Object ID

        queueEvent(self, function (err, ret) {
            delete (self.svchandle);
            if (callback) {
                callback(err, ret);
            }
        });
    };

    function bindEvents(connection, callback) {
        /**
         * On socket 'close'
         */
        connection._socket.on('close', function () {

            connection._isClosed = true;

            if (connection._isDetach) {
                return;
            }

            if (!connection.db) {
                if (callback) {
                    callback(connection.error);
                }
                return;
            }

            setImmediate(function () {
                reconnect(connection);
            });
        });

        /**
         * On socket 'error'
         */
        connection._socket.on('error', function (e) {

            connection.error = e;

            if (connection.db) {
                connection.db.emit('error', e);
            }

            if (callback) {
                callback(e);
            }
        });

        /**
         * On socket 'connect'
         */
        connection._socket.on('connect', function () {
            connection._isClosed = false;
            connection._isOpened = true;
            if (callback) {
                callback();
            }
        });

        /**
         * On socket 'data'
         */
        connection._socket.on('data', function (data) {
            var obj, cb, pos, xdr, buf;

            if (!connection._xdr) {
                xdr = new Serialize.XdrReader(data);
            } else {
                xdr = connection._xdr;
                delete(connection._xdr);
                buf = new Buffer(data.length + xdr.buffer.length);
                xdr.buffer.copy(buf);
                data.copy(buf, xdr.buffer.length);
                xdr.buffer = buf;
            }

            while (xdr.pos < xdr.buffer.length) {

                pos = xdr.pos;

                try {
                    cb = connection._queue[0];
                    obj = decodeResponse(xdr, cb, connection.db);
                } catch (err) {
                    xdr.buffer = xdr.buffer.slice(pos);
                    xdr.pos = 0;
                    connection._xdr = xdr;
                    return;
                }

                connection._queue.shift();
                connection._pending.shift();

                if (Utils.isError(obj)) {
                    Messages.lookupMessages(obj.status, function (message) {
                        obj.message = message;
                        Utils.doCallback(obj, cb);
                    });
                } else {
                    Utils.doCallback(obj, cb);
                }
            }

            // auto detach if needed and no operation running
            if (connection._detachAuto && !connection.inOperation()) {
                clearTimeout(connection._detachTimeout);
                connection._detachTimeout = setTimeout(function () {
                    connection.db.detach(connection._detachCallback);
                    connection._detachAuto = false;
                }, 100);
            }

        });
    }

    function reconnect(connection) {
        connection._socket = null;
        connection._msg = null;
        connection._blr = null;

        var ctx = new Connection(connection.host, connection.port, function (err) {
            ctx.connect(connection.options.filename, function (err) {

                if (err) {
                    connection.emit('error', err);
                    return;
                }

                ctx.attach(connection.options, function (err) {

                    if (err) {
                        connection.emit('error', err);
                        return;
                    }

                    ctx._queue = ctx._queue.concat(connection._queue);
                    ctx._pending = ctx._pending.concat(connection._pending);
                    connection.db.emit('reconnect');

                }, connection.db);
            });

        }, connection.options, connection.db);
    }

    function queueEvent(connection, callback) {
        if (connection._isClosed) {
            if (callback) {
                callback(new Error('Connection is closed.'));
            }
            return;
        }

        connection._queue.push(callback);
        connection._socket.write(connection._msg.getData());
    }

    function calcBlr(blr, xsqlda) {
        blr.addBytes([Const.BLR_version5, Const.BLR_begin, Const.BLR_message, 0]); // + message number
        blr.addWord(xsqlda.length * 2);

        for (var i = 0, length = xsqlda.length; i < length; i++) {
            xsqlda[i].calcBlr(blr);
            blr.addByte(Const.BLR_short);
            blr.addByte(0);
        }

        blr.addByte(Const.BLR_end);
        blr.addByte(Const.BLR_eoc);
    }

    function describeStatement(ret, statement) {
        var br = new Serialize.BlrReader(ret.buffer);
        var parameters = null;

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
                    describeSqlVars(br, parameters);
            }
        }
    }

    function describeSqlVars(br, parameters) {
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

    function prepareStatementParams(connection, transaction, params, input, callback) {
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

            connection.createBlob2(transaction, function (err, blob) {

                var b;
                var isStream = value.readable;

                if (Buffer.isBuffer(value)) {
                    b = value;
                } else if (typeof(value) === 'string') {
                    b = new Buffer(value, Const.DEFAULT_ENCODING);
                } else if (!isStream) {
                    b = new Buffer(JSON.stringify(value), Const.DEFAULT_ENCODING);
                }

                if (Buffer.isBuffer(b)) {
                    bufferReader(b, 1024, function (b, next) {
                        connection.batchSegments(blob, b, next);
                    }, function () {
                        ret[index] = Fields.createQuadSQLParam(blob.oid);
                        connection.closeBlob(blob, callback);
                    });
                    return;
                }

                var isReading = false;
                var isEnd = false;

                value.on('data', function (chunk) {
                    value.pause();
                    isReading = true;
                    bufferReader(chunk, 1024, function (b, next) {
                        connection.batchSegments(blob, b, next);
                    }, function () {
                        isReading = false;

                        if (isEnd) {
                            ret[index] = Fields.createQuadSQLParam(blob.oid);
                            connection.closeBlob(blob, callback);
                        } else {
                            value.resume();
                        }
                    });
                });

                value.on('end', function () {
                    isEnd = true;
                    if (isReading) {
                        return;
                    }
                    ret[index] = Fields.createQuadSQLParam(blob.oid);
                    connection.closeBlob(blob, callback);
                });
            });
        }

        for (var i = 0, length = params.length; i < length; i++) {
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

    function decodeResponse(data, callback, db) {
        var r;
        do {
            r = data.readInt();
        } while (r === Const.OP_dummy);

        switch (r) {
            case Const.OP_response:
                return decodeSimpleResponse(data, callback, db);

            case Const.OP_fetch_response:
                return decodeFetchResponse(data, callback, db, r);

            case Const.OP_accept:
                if (data.readInt() !== Const.PROTOCOL_VERSION10 || data.readInt() !== Const.ARCHITECTURE_GENERIC || data.readInt() !== Const.PTYPE_batch_send) {
                    throw new Error('Invalid connect result');
                }
                return {};

            default:
                throw new Error('Unexpected response:' + r);
        }
    }

    function decodeSimpleResponse(data, callback, db) {
        var response, item, op;

        if (callback) {
            response = callback.response || {};
        } else {
            response = {};
        }

        response.handle = data.readInt();
        var oid = data.readQuad();
        if (oid.low || oid.high) {
            response.oid = oid;
        }

        var buf = data.readArray();
        if (buf) {
            response.buffer = buf;
        }

        var num;
        while (true) {
            op = data.readInt();
            switch (op) {
                case Const.ISC_arg_end:
                    return response;
                case Const.ISC_arg_gds:
                    num = data.readInt();
                    if (!num) {
                        break;
                    }
                    item = {gdscode: num};
                    if (response.status) {
                        response.status.push(item);
                    } else {
                        response.status = [item];
                    }
                    break;
                case Const.ISC_arg_string:
                case Const.ISC_arg_interpreted:
                case Const.ISC_arg_sql_state:

                    if (item.params) {
                        var str = data.readString(Const.DEFAULT_ENCODING);
                        item.params.push(str);
                    } else {
                        item.params = [data.readString(Const.DEFAULT_ENCODING)];
                    }

                    break;

                case Const.ISC_arg_number:
                    num = data.readInt();

                    if (item.params) {
                        item.params.push(num);
                    } else {
                        item.params = [num];
                    }

                    if (item.gdscode === Const.ISC_sqlerr) {
                        response.sqlcode = num;
                    }

                    break;

                default:
                    throw new Error('Unexpected: ' + op);
            }
        }
    }

    function decodeFetchResponse(data, callback, db) {
        var item, op, i, length;
        var status = data.readInt();
        var count = data.readInt();
        var statement = callback.statement;
        var output = statement.output;
        var custom = statement.custom || {};
        var cols = null;
        var rows = custom.asStream ? null : [];
        var index = 0;

        if (custom.asObject) {
            cols = [];
            length = output.length;
            for (i = 0; i < length; i++) {
                cols.push(output[i].alias.toLowerCase());
            }
        }

        while (count && (status !== 100)) {
            var row = custom.asObject ? {} : new Array(output.length);

            length = output.length;
            for (i = 0; i < length; i++) {

                item = output[i];
                var value = item.decode(data);

                if (custom.asObject) {
                    if (item.type === Const.SQL_BLOB) {
                        value = fetchBlobAsync(statement, value, cols[i]);
                    }
                    row[cols[i]] = value;
                }
                else {
                    if (item.type === Const.SQL_BLOB) {
                        value = fetchBlobAsync(statement, value, i);
                    }
                    row[i] = value;
                }
            }

            statement.connection.db.emit('row', row, index, custom.asObject);

            op = data.readInt(); // ??
            status = data.readInt();
            count = data.readInt();

            if (!custom.asStream) {
                rows.push(row);
            }

            if (custom.on) {
                custom.on(row, index);
            }

            index++;
        }

        statement.connection.db.emit('result', rows);
        return {
            data: rows,
            fetched: Boolean(status === 100)
        };
    }

    function fetchBlobAsync(statement, id, name) {
        if (!id) {
            return null;
        }

        return function (callback) {
            // callback(err, buffer, name);
            statement.connection.startTransaction(Const.ISOLATION_READ_UNCOMMITTED, function (err, transaction) {

                if (err) {
                    callback(err);
                    return;
                }

                statement.connection.beginOperation('openBlob');
                statement.connection.openBlob(id, transaction, function (err, blob) {

                    var e = new Events.EventEmitter();

                    e.pipe = function (stream) {
                        e.on('data', function (chunk) {
                            stream.write(chunk);
                        });
                        e.on('end', function () {
                            stream.end();
                        });
                    };

                    if (err) {
                        callback(err, name, e);
                        return;
                    }

                    function read() {
                        statement.connection.getSegment(blob, function (err, ret) {
                            if (err) {
                                e.emit('error', err);
                                return;
                            }

                            if (ret.buffer) {
                                var blr = new Serialize.BlrReader(ret.buffer);
                                var data = blr.readSegment();

                                e.emit('data', data);
                            }

                            if (ret.handle !== 2) {
                                read();
                                return;
                            }

                            e.emit('end');
                            e = null;
                            statement.connection.closeBlob(blob);
                            transaction.commit();
                        });
                    }

                    callback(err, name, e);
                    read();

                });
            });
        };
    }

    function bufferReader(buffer, max, writer, cb, beg, end) {
        beg = beg || 0;
        end = end || max;

        if (end >= buffer.length) {
            end = undefined;
        }

        var b = buffer.slice(beg, end);

        writer(b, function () {
            if (end === undefined) {
                cb();
                return;
            }

            bufferReader(buffer, max, writer, cb, beg + max, end + max);
        });
    }
})();