(function() {
    'use strict';

    module.exports.GDSError = GDSError;

    function GDSError(gdsObject) {
        this.name = 'GDSError';
        this.message = '';
        this.stack = (new Error()).stack;
        this.code = -1;

        if (gdsObject) {
            this.message = gdsObject.message || '';
            if (gdsObject.status && gdsObject.status.length > 0) {
                this.code = gdsObject.status[0].gdscode || -1;
            }
        }
    }
    GDSError.prototype = Object.create(Error.prototype);
    GDSError.prototype.constructor = GDSError;
})();