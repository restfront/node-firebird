(function() {
    'use strict';

    class GDSError extends Error {
        constructor(gdsObject) {
            let message = gdsObject && gdsObject.message || '';
            super(message);

            this.name = 'GDSError';
            this.message = message;
            this.code = gdsObject && gdsObject.status && gdsObject.status.length > 0 && gdsObject.status[0].gdscode || -1;
        }
    }

    module.exports = {
        GDSError
    };
})();