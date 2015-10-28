(function () {
    'use strict';

    var Utils = require('./utils');
    var Const = require('./const');

    module.exports = new Fields();

    var ScaleDivisor = [
        1, 10, 100, 1000, 10000, 100000, 1000000, 10000000, 100000000, 1000000000, 10000000000,
        100000000000, 1000000000000, 10000000000000, 100000000000000, 1000000000000000
    ];
    var DateOffset = 40587;
    var TimeCoeff = 86400000;
    var MsPerMinute = 60000;

    function Fields() {}

    /**
     * Create SQLVar object by type
     *
     * @param {Number} type
     * @returns {Object}
     */
    Fields.prototype.createSQLVar = function(type) {
        type = type & ~1;

        switch (type) {
            case Const.SQL_VARYING:
                return new SQLVarString();

            case Const.SQL_NULL:
                return new SQLVarNull();

            case Const.SQL_TEXT:
                return new SQLVarText();

            case Const.SQL_DOUBLE:
                return new SQLVarDouble();

            case Const.SQL_FLOAT:
            case Const.SQL_D_FLOAT:
                return new SQLVarFloat();

            case Const.SQL_TYPE_DATE:
                return new SQLVarDate();

            case Const.SQL_TYPE_TIME:
                return new SQLVarTime();

            case Const.SQL_TIMESTAMP:
                return new SQLVarTimeStamp();

            case Const.SQL_BLOB:
                return new SQLVarBlob();

            case Const.SQL_ARRAY:
                return new SQLVarArray();

            case Const.SQL_QUAD:
                return new SQLVarQuad();

            case Const.SQL_LONG:
                return new SQLVarInt();

            case Const.SQL_SHORT:
                return new SQLVarShort();

            case Const.SQL_INT64:
                return new SQLVarInt64();

            case Const.SQL_BOOLEAN:
                return new SQLVarBoolean();

            default:
                throw new Error('Unexpected var type');
        }
    };

    Fields.prototype.createSQLParam = function(value, type) {
        switch (type) {
            case Const.SQL_BLOB:
                throw new Error("SQL_BLOB param should be created in 'putBlobData'");

            case Const.SQL_TIMESTAMP:
            case Const.SQL_TYPE_DATE:
            case Const.SQL_TYPE_TIME:
                if (value instanceof Date) {
                    return new SQLParamDate(value);
                } else if (typeof(value) === 'string') {
                    return new SQLParamDate(Utils.parseDate(value));
                }

                return new SQLParamDate(new Date(value));

            default:
                return createSQLParamByValue(value);
        }
    };

    Fields.prototype.createQuadSQLParam = function(blobID) {
        return new SQLParamQuad(blobID);
    };

    Fields.prototype.createNullSQLParam = function(type) {
        switch (type) {
            case Const.SQL_VARYING:
            case Const.SQL_NULL:
            case Const.SQL_TEXT:
                return new SQLParamString(null);

            case Const.SQL_DOUBLE:
            case Const.SQL_FLOAT:
            case Const.SQL_D_FLOAT:
                return new SQLParamDouble(null);

            case Const.SQL_TYPE_DATE:
            case Const.SQL_TYPE_TIME:
            case Const.SQL_TIMESTAMP:
                return new SQLParamDate(null);

            case Const.SQL_BLOB:
            case Const.SQL_ARRAY:
            case Const.SQL_QUAD:
                return new SQLParamQuad(null);

            case Const.SQL_LONG:
            case Const.SQL_SHORT:
            case Const.SQL_INT64:
            case Const.SQL_BOOLEAN:
                return new SQLParamInt(null);

            default:
                return null;
        }
    };

    function createSQLParamByValue(value) {
        switch (typeof value) {
            case 'number':
                if (value % 1 === 0) {
                    if (value >= Const.MIN_INT && value <= Const.MAX_INT) {
                        return new SQLParamInt(value);
                    } else {
                        return new SQLParamInt64(value);
                    }
                }

                return new SQLParamDouble(value);

            case 'string':
                return new SQLParamString(value);

            case 'boolean':
                return new SQLParamBool(value);

            default:
                return new SQLParamString(value.toString());

        }
    }

    /**
     * SQLVarText
     * @constructor
     */
    function SQLVarText() {}

    SQLVarText.prototype.decode = function (data) {
        var ret;
        if (this.subType > 1) {
            ret = data.readText(this.length, Const.DEFAULT_ENCODING);
        } else {
            ret = data.readBuffer(this.length);
        }

        if (!data.readInt()) {
            return ret;
        }
        return null;
    };

    SQLVarText.prototype.calcBlr = function (blr) {
        blr.addByte(Const.BLR_text);
        blr.addWord(this.length);
    };

    /**
     * SQLVarNull
     * @constructor
     */
    function SQLVarNull() {}

    SQLVarNull.prototype = new SQLVarText();
    SQLVarNull.prototype.constructor = SQLVarNull;

    /**
     * SQLVarString
     * @constructor
     */
    function SQLVarString() {}

    SQLVarString.prototype.decode = function (data) {
        var ret;
        if (this.subType > 1) {
            ret = data.readString(Const.DEFAULT_ENCODING);
        } else {
            ret = data.readBuffer();
        }
        if (!data.readInt()) {
            return ret;
        }
        return null;
    };

    SQLVarString.prototype.calcBlr = function (blr) {
        blr.addByte(Const.BLR_varying);
        blr.addWord(this.length);
    };

    /**
     * SQLVarQuad
     * @constructor
     */
    function SQLVarQuad() {}

    SQLVarQuad.prototype.decode = function (data) {
        var ret = data.readQuad();
        if (!data.readInt()) {
            return ret;
        }
        return null;
    };

    SQLVarQuad.prototype.calcBlr = function (blr) {
        blr.addByte(Const.BLR_quad);
        blr.addShort(this.scale);
    };

    /**
     * SQLVarBlob
     * @constructor
     */
    function SQLVarBlob() {}

    SQLVarBlob.prototype = new SQLVarQuad();
    SQLVarBlob.prototype.constructor = SQLVarBlob;

    SQLVarBlob.prototype.calcBlr = function (blr) {
        blr.addByte(Const.BLR_quad);
        blr.addShort(0);
    };

    /**
     * SQLVarArray
     * @constructor
     */
    function SQLVarArray() {}

    SQLVarArray.prototype = new SQLVarQuad();
    SQLVarArray.prototype.constructor = SQLVarArray;

    SQLVarArray.prototype.calcBlr = function (blr) {
        blr.addByte(Const.BLR_quad);
        blr.addShort(0);
    };

    /**
     * SQLVarInt
     * @constructor
     */
    function SQLVarInt() {}

    SQLVarInt.prototype.decode = function (data) {
        var ret = data.readInt();
        if (!data.readInt()) {
            if (this.scale) {
                ret = ret / ScaleDivisor[Math.abs(this.scale)];
            }
            return ret;
        }
        return null;
    };

    SQLVarInt.prototype.calcBlr = function (blr) {
        blr.addByte(Const.BLR_long);
        blr.addShort(this.scale);
    };

    /**
     * SQLVarShort
     * @constructor
     */
    function SQLVarShort() {}

    SQLVarShort.prototype = new SQLVarInt();
    SQLVarShort.prototype.constructor = SQLVarShort;

    SQLVarShort.prototype.calcBlr = function (blr) {
        blr.addByte(Const.BLR_short);
        blr.addShort(this.scale);
    };

    /**
     * SQLVarInt64
     * @constructor
     */
    function SQLVarInt64() {}

    SQLVarInt64.prototype.decode = function (data) {
        var ret = data.readInt64();
        if (!data.readInt()) {
            if (this.scale) {
                ret = ret / ScaleDivisor[Math.abs(this.scale)];
            }
            return ret;
        }
        return null;
    };

    SQLVarInt64.prototype.calcBlr = function (blr) {
        blr.addByte(Const.BLR_int64);
        blr.addShort(this.scale);
    };

    /**
     * SQLVarFloat
     * @constructor
     */
    function SQLVarFloat() {}

    SQLVarFloat.prototype.decode = function (data) {
        var ret = data.readFloat();
        if (!data.readInt()) {
            return ret;
        }
        return null;
    };

    SQLVarFloat.prototype.calcBlr = function (blr) {
        blr.addByte(Const.BLR_float);
    };

    /**
     * SQLVarDouble
     * @constructor
     */
    function SQLVarDouble() {}

    SQLVarDouble.prototype.decode = function (data) {
        var ret = data.readDouble();
        if (!data.readInt()) {
            return ret;
        }
        return null;
    };

    SQLVarDouble.prototype.calcBlr = function (blr) {
        blr.addByte(Const.BLR_double);
    };

    /**
     * SQLVarDate
     * @constructor
     */
    function SQLVarDate() {}

    SQLVarDate.prototype.decode = function (data) {
        var ret = data.readInt();
        if (!data.readInt()) {
            var d = new Date(0);
            d.setMilliseconds((ret - DateOffset) * TimeCoeff + d.getTimezoneOffset() * MsPerMinute);
            return d;
        }
        return null;
    };

    SQLVarDate.prototype.calcBlr = function (blr) {
        blr.addByte(Const.BLR_sql_date);
    };

    /**
     * SQLVarTime
     * @constructor
     */
    function SQLVarTime() {}

    SQLVarTime.prototype.decode = function (data) {
        var ret = data.readUInt();
        if (!data.readInt()) {
            var d = new Date(0);
            d.setMilliseconds(Math.floor(ret / 10) + d.getTimezoneOffset() * MsPerMinute);
            return d;
        }
        return null;
    };

    SQLVarTime.prototype.calcBlr = function (blr) {
        blr.addByte(Const.BLR_sql_time);
    };

    /**
     * SQLVarTimeStamp
     * @constructor
     */
    function SQLVarTimeStamp() {}

    SQLVarTimeStamp.prototype.decode = function (data) {
        var date = data.readInt();
        var time = data.readUInt();
        if (!data.readInt()) {
            var d = new Date(0);
            d.setMilliseconds((date - DateOffset) * TimeCoeff + Math.floor(time / 10) + d.getTimezoneOffset() * MsPerMinute);
            return d;
        }
        return null;
    };

    SQLVarTimeStamp.prototype.calcBlr = function (blr) {
        blr.addByte(Const.BLR_timestamp);
    };

    /**
     * SQLVarBoolean
     * @constructor
     */
    function SQLVarBoolean() {}

    SQLVarBoolean.prototype.decode = function (data) {
        var ret = data.readInt();
        if (!data.readInt()) {
            return Boolean(ret);
        }
        return null;
    };

    SQLVarBoolean.prototype.calcBlr = function (blr) {
        blr.addByte(Const.BLR_bool);
    };

    /**
     * SQLParamInt
     * @param value
     * @constructor
     */
    function SQLParamInt(value) {
        this.value = value;
    }

    SQLParamInt.prototype.calcBlr = function (blr) {
        blr.addByte(Const.BLR_long);
        blr.addShort(0);
    };

    SQLParamInt.prototype.encode = function (data) {
        if (this.value != null) {
            data.addInt(this.value);
            data.addInt(0);
        } else {
            data.addInt(0);
            data.addInt(1);
        }
    };

    /**
     * SQLParamInt64
     * @param value
     * @constructor
     */
    function SQLParamInt64(value) {
        this.value = value;
    }

    SQLParamInt64.prototype.calcBlr = function (blr) {
        blr.addByte(Const.BLR_int64);
        blr.addShort(0);
    };

    SQLParamInt64.prototype.encode = function (data) {
        if (this.value != null) {
            data.addInt64(this.value);
            data.addInt(0);
        } else {
            data.addInt64(0);
            data.addInt(1);
        }
    };

    /**
     * SQLParamDouble
     * @param value
     * @constructor
     */
    function SQLParamDouble(value) {
        this.value = value;
    }

    SQLParamDouble.prototype.encode = function (data) {
        if (this.value != null) {
            data.addDouble(this.value);
            data.addInt(0);
        } else {
            data.addDouble(0);
            data.addInt(1);
        }
    };

    SQLParamDouble.prototype.calcBlr = function (blr) {
        blr.addByte(Const.BLR_double);
    };

    /**
     * SQLParamString
     * @param value
     * @constructor
     */
    function SQLParamString(value) {
        this.value = value;
    }

    SQLParamString.prototype.encode = function (data) {
        if (this.value != null) {
            data.addText(this.value, Const.DEFAULT_ENCODING);
            data.addInt(0);
        } else {
            data.addInt(1);
        }
    };

    SQLParamString.prototype.calcBlr = function (blr) {
        blr.addByte(Const.BLR_text);
        var len = this.value ? Buffer.byteLength(this.value, Const.DEFAULT_ENCODING) : 0;
        blr.addWord(len);
    };

    /**
     * SQLParamQuad
     * @param value
     * @constructor
     */
    function SQLParamQuad(value) {
        this.value = value;
    }

    SQLParamQuad.prototype.encode = function (data) {
        if (this.value != null) {
            data.addInt(this.value.high);
            data.addInt(this.value.low);
            data.addInt(0);
        } else {
            data.addInt(0);
            data.addInt(0);
            data.addInt(1);
        }
    };

    SQLParamQuad.prototype.calcBlr = function (blr) {
        blr.addByte(Const.BLR_quad);
        blr.addShort(0);
    };

    /**
     * SQLParamDate
     * @param value
     * @constructor
     */
    function SQLParamDate(value) {
        this.value = value;
    }

    SQLParamDate.prototype.encode = function (data) {
        if (this.value != null) {

            var value = this.value.getTime() - this.value.getTimezoneOffset() * MsPerMinute;
            var time = value % TimeCoeff;
            var date = (value - time) / TimeCoeff + DateOffset;
            time *= 10;

            // check overflow
            if (time < 0) {
                date--;
                time = TimeCoeff * 10 + time;
            }

            data.addInt(date);
            data.addUInt(time);
            data.addInt(0);
        } else {
            data.addInt(0);
            data.addUInt(0);
            data.addInt(1);
        }
    };

    SQLParamDate.prototype.calcBlr = function (blr) {
        blr.addByte(Const.BLR_timestamp);
    };

    /**
     * SQLParamBool
     * @param value
     * @constructor
     */
    function SQLParamBool(value) {
        this.value = value;
    }

    SQLParamBool.prototype.encode = function (data) {
        if (this.value != null) {
            data.addInt(this.value ? 1 : 0);
            data.addInt(0);
        } else {
            data.addInt(0);
            data.addInt(1);
        }
    };

    SQLParamBool.prototype.calcBlr = function (blr) {
        blr.addByte(Const.BLR_short);
        blr.addShort(0);
    };
})();