const DEBUG = process.env.NODE_ENV === 'development';

class Logger {
    static info(message, data = null) {
        if (DEBUG) {
            if (data) {
                console.log(`[INFO] ${message}:`, data);
            } else {
                console.log(`[INFO] ${message}`);
            }
        }
    }

    static error(message, error = null) {
        if (error) {
            console.error(`[ERROR] ${message}:`, error);
        } else {
            console.error(`[ERROR] ${message}`);
        }
    }

    static debug(message, data = null) {
        if (DEBUG) {
            if (data) {
                console.log(`[DEBUG] ${message}:`, data);
            } else {
                console.log(`[DEBUG] ${message}`);
            }
        }
    }
}

export default Logger; 