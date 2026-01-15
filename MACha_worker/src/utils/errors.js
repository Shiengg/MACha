import { ERROR_TYPES } from "../constants/index.js";

export const createPermanentError = (message, originalError = null) => {
    const error = originalError || new Error(message);
    error.isPermanent = true;
    error.errorType = ERROR_TYPES.PERMANENT;
    return error;
};

export const createTemporaryError = (message, originalError = null) => {
    const error = originalError || new Error(message);
    error.isPermanent = false;
    error.errorType = ERROR_TYPES.TEMPORARY;
    return error;
};

export const createRateLimitError = (message, originalError = null) => {
    const error = originalError || new Error(message);
    error.isPermanent = false;
    error.errorType = ERROR_TYPES.RATE_LIMIT;
    return error;
};

export const isPermanentError = (error) => {
    return error && error.isPermanent === true;
};

export const isRetryableError = (error) => {
    return error && error.isPermanent !== true;
};

