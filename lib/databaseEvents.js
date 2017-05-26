(function () {
    'use strict';

    const net = require('net');
    const Events = require('events');

    const Serialize = require('./serialize');
    const Utils = require('./utils');
    const Const = require('./const');

    class FbEventManager extends Events.EventEmitter {
        constructor(db, eventconnection, eventid, callback) {
            super();

            this.db = db;
            this.eventconnection = eventconnection;
            this.events = {};
            this.eventid = eventid;

            __createEventLoop(this, callback);
        }

        registerEvent(events, callback) {
            if (this.db.connection._isClosed || this.eventconnection._isClosed) {
                return this.eventconnection.throwClosed(callback);
            }

            events.forEach((event) => {
                this.events[event] = this.events[event] || 0;
            });

            __changeEvent(this, callback);
        }

        unregisterEvent(events, callback) {
            if (this.db.connection._isClosed || this.eventconnection._isClosed) {
                return this.eventconnection.throwClosed(callback);
            }

            events.forEach((event) => {
                delete this.events[event];
            });

            __changeEvent(this, callback);
        }

        close(callback) {
            this.db.connection.closeEvents(this.eventid, (err) => {
                if (err) {
                    Utils.doError(err, callback);
                    return;
                }

                this.eventconnection._socket.end();
            });
        }
    }

    class EventConnection {
        constructor(host, port, callback, db) {
            this.db = db;
            this.emgr = null;
            this._isClosed = false;
            this._isOpened = false;
            this._socket = net.createConnection(port, host);

            __bindEvents(this, host, port, callback);
            // this.error;
            // this.eventcallback;
        }

        throwClosed(callback) {
            var err = new Error('Event Connection is closed.');
            this.db.emit('error', err);
            if (callback) {
                callback(err);
            }
            return this;
        }
    }

    module.exports = {
        FbEventManager,
        EventConnection
    };

    function __createEventLoop(manager, callback) {
        const cnx = manager.db.connection;
        manager.eventconnection.emgr = manager;
        // create the loop
        function loop(first) {
            cnx.queEvents(manager.events, manager.eventid, function (err, ret) {
                if (err) {
                    Utils.doError(err, callback);
                    return;
                }
                if (first) {
                    callback();
                }
            });
        }

        manager.eventconnection.eventcallback = function (err, ret) {
            if (err || (manager.eventid !== ret.eventid)) {
                Utils.ddoError(err || new Error('Bad eventid'), callback);
                return;
            }

            ret.events.forEach(function (event) {
                manager.emit('post_event', event.name, event.count);
            });

            loop(false);
        };

        loop(true);
    }

    function __changeEvent(manager, callback) {
        manager.db.connection.closeEvents(manager.eventid, function (err) {
            if (err) {
                Utils.doError(err, callback);
                return;
            }

            manager.db.connection.queEvents(manager.events, manager.eventid, callback);
        });
    }

    function __bindEvents(connection, host, port, callback) {
        connection._socket.on('close', function () {
            connection._isClosed = true;
        });

        connection._socket.on('error', function (e) {
            connection.error = e;
        });

        connection._socket.on('connect', function () {
            connection._isClosed = false;
            connection._isOpened = true;
            if (callback) {
                callback();
            }
        });

        connection._socket.on('data', function (data) {
            var xdr, buf;

            if (!connection._xdr) {
                xdr = new Serialize.XdrReader(data);
            } else {
                xdr = connection._xdr;
                delete (connection._xdr);
                buf = new Buffer(data.length + xdr.buffer.length);
                xdr.buffer.copy(buf);
                data.copy(buf, xdr.buffer.length);
                xdr.buffer = buf;
            }

            var op_pos = xdr.pos;
            try {
                var r;
                var tmp_event;
                while (xdr.pos < xdr.buffer.length) {
                    do {
                        r = xdr.readInt();
                    } while (r === Const.OP_dummy);

                    switch (r) {
                        case Const.OP_event:
                            xdr.readInt(); // db handle
                            buf = xdr.readArray();
                            // first byte is always set to 1
                            tmp_event = {};
                            var lst_event = [];
                            var eventname = '';
                            var eventcount = 0;
                            var pos = 1;
                            while (pos < buf.length) {
                                var len = buf.readInt8(pos++);
                                eventname = buf.toString(Const.DEFAULT_ENCODING, pos, pos + len);
                                var prevcount = connection.emgr.events[eventname] || 0;
                                pos += len;
                                eventcount = buf.readInt32LE(pos);
                                tmp_event[eventname] = eventcount;
                                pos += 4;
                                if (prevcount !== 0 && prevcount !== eventcount) {
                                    lst_event.push({name: eventname, count: eventcount});
                                }
                            }
                            xdr.readInt64(); // ignore AST INFO
                            var event_id = xdr.readInt();
                            // set the new count in global event hash
                            for (var evt in tmp_event) {
                                if (tmp_event.hasOwnProperty(evt)) {
                                    connection.emgr.events[evt] = tmp_event[evt];
                                }
                            }
                            if (connection.eventcallback) {
                                return connection.eventcallback(null, {eventid: event_id, events: lst_event});
                            }
                            break;

                        default:
                            if (connection.eventcallback) {
                                return connection.eventcallback(new Error('Unexpected:' + r));
                            }
                    }
                }
            } catch (err) {
                if (err instanceof RangeError) { // incomplete packet case
                    xdr.buffer = xdr.buffer = xdr.buffer.slice(op_pos);
                    xdr.pos = 0;
                    connection._xdr = xdr;
                }
            }
        });
    }
})();