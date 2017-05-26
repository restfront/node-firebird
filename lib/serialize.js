(function () {
    'use strict';

    const Long = require('long');

    const
        MAX_STRING_SIZE = 255;

    /**
     * BlrWriter
     */
    class BlrWriter {
        /**
         * @param {Number} size
         * @constructor
         */
        constructor(size) {
            this.buffer = new Buffer(size || 32);
            this.pos = 0;
        }

        ensure(len) {
            let newLength = this.buffer.length;
            while (newLength < this.pos + len) {
                newLength *= 2;
            }

            if (this.buffer.length >= newLength) {
                return;
            }

            const b = new Buffer(newLength);
            this.buffer.copy(b);
            delete(this.buffer);
            this.buffer = b;
        }

        addByte(b) {
            this.ensure(1);
            this.buffer.writeUInt8(b, this.pos);
            this.pos++;
        }

        addShort(b) {
            this.ensure(1);
            this.buffer.writeInt8(b, this.pos);
            this.pos++;
        }

        addSmall(b) {
            this.ensure(2);
            this.buffer.writeInt16LE(b, this.pos);
            this.pos += 2;
        }

        addWord(b) {
            this.ensure(2);
            this.buffer.writeUInt16LE(b, this.pos);
            this.pos += 2;
        }

        addInt32(b) {
            this.ensure(4);
            this.buffer.writeUInt32LE(b, this.pos);
            this.pos += 4;
        }

        addByteInt32(c, b) {
            this.addByte(c);
            this.ensure(4);
            this.buffer.writeUInt32LE(b, this.pos);
            this.pos += 4;
        }

        addNumeric(c, v) {
            if (v < 256) {
                this.ensure(3);
                this.buffer.writeUInt8(c, this.pos);
                this.pos++;
                this.buffer.writeUInt8(1, this.pos);
                this.pos++;
                this.buffer.writeUInt8(v, this.pos);
                this.pos++;
                return;
            }

            this.ensure(6);
            this.buffer.writeUInt8(c, this.pos);
            this.pos++;
            this.buffer.writeUInt8(4, this.pos);
            this.pos++;
            this.buffer.writeInt32BE(v, this.pos);
            this.pos += 4;

        }

        addBytes(b) {
            this.ensure(b.length);
            for (let i = 0, length = b.length; i < length; i++) {
                this.buffer.writeUInt8(b[i], this.pos);
                this.pos++;
            }
        }

        addString(c, s, encoding) {
            this.addByte(c);

            const len = Buffer.byteLength(s, encoding);
            if (len > MAX_STRING_SIZE) {
                throw new Error('blr string is too big');
            }

            this.ensure(len + 1);
            this.buffer.writeUInt8(len, this.pos);
            this.pos++;
            this.buffer.write(s, this.pos, len, encoding);
            this.pos += len;
        }

        addString2(c, s, encoding) {
            this.addByte(c);

            const len = Buffer.byteLength(s, encoding);
            if (len > MAX_STRING_SIZE * MAX_STRING_SIZE) {
                throw new Error('blr string is too big');
            }

            this.ensure(len + 2);
            this.buffer.writeUInt16LE(len, this.pos);
            this.pos += 2;
            this.buffer.write(s, this.pos, len, encoding);
            this.pos += len;
        }

        addBuffer(b) {
            this.addSmall(b.length);
            this.ensure(b.length);
            b.copy(this.buffer, this.pos);
            this.pos += b.length;
        }
    }

    /**
     * BlrReader
     */
    class BlrReader {
        /**
         * @param {Buffer} buffer
         * @constructor
         */
        constructor(buffer) {
            this.buffer = buffer;
            this.pos = 0;
        }

        readByteCode() {
            return this.buffer.readUInt8(this.pos++);
        }

        readInt32() {
            const value = this.buffer.readUInt32LE(this.pos);
            this.pos += 4;
            return value;
        }

        readInt() {
            // length of value
            const len = this.buffer.readUInt16LE(this.pos);
            this.pos += 2;

            // value
            let value;
            switch (len) {
                case 1:
                    value = this.buffer.readInt8(this.pos);
                    break;
                case 2:
                    value = this.buffer.readInt16LE(this.pos);
                    break;
                case 4:
                    value = this.buffer.readInt32LE(this.pos);
            }
            this.pos += len;
            return value;
        }

        readString(encoding) {
            // length of string
            const len = this.buffer.readUInt16LE(this.pos);
            this.pos += 2;

            if (len <= 0) {
                return '';
            }

            // string
            const str = this.buffer.toString(encoding, this.pos, this.pos + len);
            this.pos += len;
            return str;
        }

        readSegment() {
            // length of first segment
            let len = this.buffer.readUInt16LE(this.pos);
            this.pos += 2;

            let segment;
            while (len > 0) {
                // segment
                if (segment) {
                    const tmp = segment;
                    segment = new Buffer(tmp.length + len);
                    tmp.copy(segment);
                    this.buffer.copy(segment, tmp.length, this.pos, this.pos + len);
                } else {
                    segment = new Buffer(len);
                    this.buffer.copy(segment, 0, this.pos, this.pos + len);
                }

                this.pos += len;
                if (this.pos === this.buffer.length) {
                    break;
                }

                // length of next segment
                len = this.buffer.readUInt16LE(this.pos);
                this.pos += 2;
            }

            return segment;
        }
    }

    /**
     * XdrWriter
     */
    class XdrWriter {
        /**
         * @param {Number} size
         * @constructor
         */
        constructor(size) {
            this.buffer = new Buffer(size || 32);
            this.pos = 0;
        }

        ensure(len) {
            let newLength = this.buffer.length;
            while (newLength < this.pos + len) {
                newLength *= 2;
            }

            if (this.buffer.length >= newLength) {
                return;
            }

            const b = new Buffer(newLength);
            this.buffer.copy(b);
            delete(this.buffer);
            this.buffer = b;
        }

        addInt(value) {
            this.ensure(4);
            this.buffer.writeInt32BE(value, this.pos);
            this.pos += 4;
        }

        addInt64(value) {
            this.ensure(8);
            const l = Long.fromNumber(value);
            this.buffer.writeInt32BE(l.high, this.pos);
            this.pos += 4;
            this.buffer.writeInt32BE(l.low, this.pos);
            this.pos += 4;
        }

        addUInt(value) {
            this.ensure(4);
            this.buffer.writeUInt32BE(value, this.pos);
            this.pos += 4;
        }

        addString(s, encoding) {
            const length = Buffer.byteLength(s, encoding);
            const alignedLength = __align(length);
            this.ensure(alignedLength + 4);
            this.buffer.writeInt32BE(length, this.pos);
            this.pos += 4;
            this.buffer.write(s, this.pos, length, encoding);
            this.pos += alignedLength;
        }

        addText(s, encoding) {
            const length = Buffer.byteLength(s, encoding);
            const alignedLength = __align(length);
            this.ensure(alignedLength);
            this.buffer.write(s, this.pos, length, encoding);
            this.pos += alignedLength;
        }

        addBlr(blr) {
            const alignedLength = __align(blr.pos);
            this.ensure(alignedLength + 4);
            this.buffer.writeInt32BE(blr.pos, this.pos);
            this.pos += 4;
            blr.buffer.copy(this.buffer, this.pos);
            this.pos += alignedLength;
        }

        getData() {
            return this.buffer.slice(0, this.pos);
        }

        addDouble(value) {
            this.ensure(8);
            this.buffer.writeDoubleBE(value, this.pos);
            this.pos += 8;
        }

        addQuad(quad) {
            this.ensure(8);
            const b = this.buffer;
            b.writeInt32BE(quad.high, this.pos);
            this.pos += 4;
            b.writeInt32BE(quad.low, this.pos);
            this.pos += 4;
        }
    }

    /**
     * XdrReader
     */
    class XdrReader {
        /**
         * @param {Buffer} buffer
         * @constructor
         */
        constructor(buffer) {
            this.buffer = buffer;
            this.pos = 0;
        }

        readInt() {
            const r = this.buffer.readInt32BE(this.pos);
            this.pos += 4;
            return r;
        }

        readUInt() {
            const r = this.buffer.readUInt32BE(this.pos);
            this.pos += 4;
            return r;
        }

        readInt64() {
            const high = this.buffer.readInt32BE(this.pos);
            this.pos += 4;
            const low = this.buffer.readInt32BE(this.pos);
            this.pos += 4;
            return new Long(low, high).toNumber();
        }

        readShort() {
            const r = this.buffer.readInt16BE(this.pos);
            this.pos += 2;
            return r;
        }

        readQuad() {
            const b = this.buffer;
            const high = b.readInt32BE(this.pos);
            this.pos += 4;
            const low = b.readInt32BE(this.pos);
            this.pos += 4;
            return {low: low, high: high};
        }

        readFloat() {
            const r = this.buffer.readFloatBE(this.pos);
            this.pos += 4;
            return r;
        }

        readDouble() {
            const r = this.buffer.readDoubleBE(this.pos);
            this.pos += 8;
            return r;
        }

        readArray() {
            const len = this.readInt();
            if (!len) {
                return;
            }
            const r = this.buffer.slice(this.pos, this.pos + len);
            this.pos += __align(len);
            return r;
        }

        readBuffer(len) {
            if (!arguments.length) {
                len = this.readInt();
            }

            if (!len) {
                return;
            }

            const r = this.buffer.slice(this.pos, this.pos + len);
            this.pos += __align(len);
            return r;
        }

        readString(encoding) {
            const len = this.readInt();
            return this.readText(len, encoding);
        }

        readText(len, encoding) {
            if (len <= 0) {
                return '';
            }

            const r = this.buffer.toString(encoding, this.pos, this.pos + len);
            this.pos += __align(len);
            return r;
        }
    }

    function __align(n) {
        return (n + 3) & ~3;
    }

    module.exports = {
        BlrWriter,
        BlrReader,
        XdrWriter,
        XdrReader
    };
})();