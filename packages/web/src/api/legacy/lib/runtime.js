/* eslint-disable no-unused-vars -- Imported legacy code retained without functional refactoring. */
import { AsyncLocalStorage } from 'node:async_hooks';

const requestOrigins = new AsyncLocalStorage();

function getBaseUrl() {
    return process.env.BASE_URL || requestOrigins.getStore() || '';
}

function withRequestOrigin(origin, callback) {
    return requestOrigins.run(origin, callback);
}

export { getBaseUrl, withRequestOrigin };