(function () {
    'use strict';

    const Utils = require('./utils');
    const Const = require('./const');

    module.exports = {
        createSQLVar,
        createSQLParam,
        createQuadSQLParam,
        createNullSQLParam,
        isSQLVarBlob
    };

    const ScaleDivisor = [
        1, 10, 100, 1000, 10000, 100000, 1000000, 10000000, 100000000, 1000000000, 10000000000,
        100000000000, 1000000000000, 10000000000000, 100000000000000, 1000000000000000
    ];
    const DateOffset = 40587;
    const TimeCoeff = 86400000;
    const MsPerMinute = 60000;

    /**
     * SQLVarText
     */
    class SQLVarText {
        constructor() {
            this.subType = 0;
            this.length = 0;
        }

        decode(data) {
            const ret = this.subType > 1 ?
                data.readText(this.length, Const.DEFAULT_ENCODING) :
                data.readBuffer(this.length);

            if (!data.readInt()) {
                return ret;
            }
            return null;
        }

        calcBlr(blr) {
            blr.addByte(Const.BLR_text);
            blr.addWord(this.length);
        }
    }

    /**
     * SQLVarNull
     */
    class SQLVarNull extends SQLVarText {

    }

    /**
     * SQLVarString
     */
    class SQLVarString {
        constructor() {
            this.subType = 0;
            this.length = 0;
        }

        decode(data) {
            const ret = this.subType > 1 ?
                data.readString(Const.DEFAULT_ENCODING) :
                data.readBuffer();

            if (!data.readInt()) {
                return ret;
            }
            return null;
        }

        calcBlr(blr) {
            blr.addByte(Const.BLR_varying);
            blr.addWord(this.length);
        }
    }

    /**
     * SQLVarQuad
     */
    class SQLVarQuad {
        constructor() {
            this.scale = 0;
        }

        decode(data) {
            const ret = data.readQuad();
            if (!data.readInt()) {
                return ret;
            }
            return null;
        }

        calcBlr(blr) {
            blr.addByte(Const.BLR_quad);
            blr.addShort(this.scale);
        }
    }

    /**
     * SQLVarBlob
     */
    class SQLVarBlob extends SQLVarQuad {
        calcBlr(blr) {
            blr.addByte(Const.BLR_quad);
            blr.addShort(0);
        }
    }

    /**
     * SQLVarArray
     */
    class SQLVarArray extends SQLVarQuad {
        calcBlr(blr) {
            blr.addByte(Const.BLR_quad);
            blr.addShort(0);
        }
    }

    /**
     * SQLVarInt
     */
    class SQLVarInt {
        constructor() {
            this.scale = 0;
        }

        decode(data) {
            const ret = data.readInt();
            if (!data.readInt()) {
                if (this.scale) {
                    return ret / ScaleDivisor[Math.abs(this.scale)];
                }
                return ret;
            }
            return null;
        }

        calcBlr(blr) {
            blr.addByte(Const.BLR_long);
            blr.addShort(this.scale);
        }
    }


    /**
     * SQLVarShort
     */
    class SQLVarShort extends SQLVarInt {
        calcBlr(blr) {
            blr.addByte(Const.BLR_short);
            blr.addShort(this.scale);
        }
    }

    /**
     * SQLVarInt64
     */
    class SQLVarInt64 {
        constructor() {
            this.scale = 0;
        }

        decode(data) {
            const ret = data.readInt64();
            if (!data.readInt()) {
                if (this.scale) {
                    return ret / ScaleDivisor[Math.abs(this.scale)];
                }
                return ret;
            }
            return null;
        }

        calcBlr(blr) {
            blr.addByte(Const.BLR_int64);
            blr.addShort(this.scale);
        }
    }


    /**
     * SQLVarFloat
     */
    class SQLVarFloat {
        decode(data) {
            const ret = data.readFloat();
            if (!data.readInt()) {
                return ret;
            }
            return null;
        }

        calcBlr(blr) {
            blr.addByte(Const.BLR_float);
        }
    }


    /**
     * SQLVarDouble
     */
    class SQLVarDouble {
        decode(data) {
            const ret = data.readDouble();
            if (!data.readInt()) {
                return ret;
            }
            return null;
        }

        calcBlr(blr) {
            blr.addByte(Const.BLR_double);
        }
    }


    /**
     * SQLVarDate
     */
    class SQLVarDate {
        decode(data) {
            const ret = data.readInt();
            if (!data.readInt()) {
                const d = new Date(0);
                d.setMilliseconds((ret - DateOffset) * TimeCoeff + d.getTimezoneOffset() * MsPerMinute);
                return d;
            }
            return null;
        }

        calcBlr(blr) {
            blr.addByte(Const.BLR_sql_date);
        }
    }


    /**
     * SQLVarTime
     */
    class SQLVarTime {
        decode(data) {
            const ret = data.readUInt();
            if (!data.readInt()) {
                const d = new Date(0);
                d.setMilliseconds(Math.floor(ret / 10) + d.getTimezoneOffset() * MsPerMinute);
                return d;
            }
            return null;
        }

        calcBlr(blr) {
            blr.addByte(Const.BLR_sql_time);
        }
    }

    /**
     * SQLVarTimeStamp
     */
    class SQLVarTimeStamp {
        decode(data) {
            const date = data.readInt();
            const time = data.readUInt();
            if (!data.readInt()) {
                const d = new Date(0);
                d.setMilliseconds((date - DateOffset) * TimeCoeff + Math.floor(time / 10) + d.getTimezoneOffset() * MsPerMinute);
                return d;
            }
            return null;
        }

        calcBlr(blr) {
            blr.addByte(Const.BLR_timestamp);
        }
    }


    /**
     * SQLVarBoolean
     */
    class SQLVarBoolean {
        decode(data) {
            const ret = data.readInt();
            if (!data.readInt()) {
                return Boolean(ret);
            }
            return null;
        }

        calcBlr(blr) {
            blr.addByte(Const.BLR_bool);
        }
    }


    /**
     * SQLParamInt
     */
    class SQLParamInt {
        /**
         * @param value
         * @constructor
         */
        constructor(value) {
            this.value = value;
        }

        encode(data) {
            if (this.value != null) {
                data.addInt(this.value);
                data.addInt(0);
            } else {
                data.addInt(0);
                data.addInt(1);
            }
        }

        calcBlr(blr) {
            blr.addByte(Const.BLR_long);
            blr.addShort(0);
        }
    }


    /**
     * SQLParamInt64
     */
    class SQLParamInt64 {
        /**
         * @param value
         * @constructor
         */
        constructor(value) {
            this.value = value;
        }

        encode(data) {
            if (this.value != null) {
                data.addInt64(this.value);
                data.addInt(0);
            } else {
                data.addInt64(0);
                data.addInt(1);
            }
        }

        calcBlr(blr) {
            blr.addByte(Const.BLR_int64);
            blr.addShort(0);
        }
    }

    /**
     * SQLParamDouble
     */
    class SQLParamDouble {
        /**
         * @param value
         * @constructor
         */
        constructor(value) {
            this.value = value;
        }

        encode(data) {
            if (this.value != null) {
                data.addDouble(this.value);
                data.addInt(0);
            } else {
                data.addDouble(0);
                data.addInt(1);
            }
        }

        calcBlr(blr) {
            blr.addByte(Const.BLR_double);
        }
    }

    /**
     * SQLParamString
     */
    class SQLParamString {
        /**
         * @param value
         * @constructor
         */
        constructor(value) {
            this.value = value;
        }

        encode(data) {
            if (this.value != null) {
                data.addText(this.value, Const.DEFAULT_ENCODING);
                data.addInt(0);
            } else {
                data.addInt(1);
            }
        }

        calcBlr(blr) {
            blr.addByte(Const.BLR_text);
            const len = this.value ? Buffer.byteLength(this.value, Const.DEFAULT_ENCODING) : 0;
            blr.addWord(len);
        }
    }

    /**
     * SQLParamQuad
     */
    class SQLParamQuad {
        /**
         * @param value
         * @constructor
         */
        constructor(value) {
            this.value = value;
        }

        encode(data) {
            if (this.value != null) {
                data.addInt(this.value.high);
                data.addInt(this.value.low);
                data.addInt(0);
            } else {
                data.addInt(0);
                data.addInt(0);
                data.addInt(1);
            }
        }

        calcBlr(blr) {
            blr.addByte(Const.BLR_quad);
            blr.addShort(0);
        }
    }

    /**
     * SQLParamDate
     * @param value
     * @constructor
     */
    class SQLParamDate {
        /**
         * @param value
         * @constructor
         */
        constructor(value) {
            this.value = value;
        }

        encode(data) {
            if (this.value != null) {
                const value = this.value.getTime() - this.value.getTimezoneOffset() * MsPerMinute;
                let time = value % TimeCoeff;
                let date = (value - time) / TimeCoeff + DateOffset;
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
        }

        calcBlr(blr) {
            blr.addByte(Const.BLR_timestamp);
        }
    }

    /**
     * SQLParamBool
     */
    class SQLParamBool {
        /**
         * @param value
         * @constructor
         */
        constructor(value) {
            this.value = value;
        }

        encode(data) {
            if (this.value != null) {
                data.addInt(this.value ? 1 : 0);
                data.addInt(0);
            } else {
                data.addInt(0);
                data.addInt(1);
            }
        }

        calcBlr(blr) {
            blr.addByte(Const.BLR_short);
            blr.addShort(0);
        }
    }

    /**
     * Create SQLVar object by type
     *
     * @param {Number} type
     * @returns {Object}
     */
    function createSQLVar(type) {
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
                throw new Error('Unexpected var type: ' + type);
        }
    }

    function createSQLParam(value, type) {
        switch (type) {
            case Const.SQL_BLOB:
                throw new Error('SQL_BLOB param should be created in "putBlobData"');

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
                return __createSQLParamByValue(value);
        }
    }

    function createQuadSQLParam(blobID) {
        return new SQLParamQuad(blobID);
    }

    function createNullSQLParam(type) {
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
    }

    function isSQLVarBlob(field) {
        return field instanceof SQLVarBlob;
    }

    function __createSQLParamByValue(value) {
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
})();