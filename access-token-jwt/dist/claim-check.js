import { InvalidTokenError, InsufficientScopeError, UnauthorizedError, } from 'oauth2-bearer';
const checkJSONPrimitive = (value) => {
    if (typeof value !== 'string' &&
        typeof value !== 'number' &&
        typeof value !== 'boolean' &&
        value !== null) {
        throw new TypeError("'expected' must be a string, number, boolean or null");
    }
};
const isClaimIncluded = (claim, expected) => (payload) => {
    if (!(claim in payload)) {
        throw new InvalidTokenError(`Missing '${claim}' claim`);
    }
    let actual = payload[claim];
    if (typeof actual === 'string') {
        actual = actual.split(' ');
    }
    else if (!Array.isArray(actual)) {
        return false;
    }
    actual = new Set(actual);
    return expected.every(Set.prototype.has.bind(actual));
};
export const requiredScopes = (scopes) => {
    if (typeof scopes === 'string') {
        scopes = scopes.split(' ');
    }
    else if (!Array.isArray(scopes)) {
        throw new TypeError("'scopes' must be a string or array of strings");
    }
    const fn = isClaimIncluded('scope', scopes);
    return claimCheck((payload) => {
        if (!('scope' in payload)) {
            throw new InsufficientScopeError(scopes, "Missing 'scope' claim");
        }
        if (!fn(payload)) {
            throw new InsufficientScopeError(scopes);
        }
        return true;
    });
};
export const claimIncludes = (claim, ...expected) => {
    if (typeof claim !== 'string') {
        throw new TypeError("'claim' must be a string");
    }
    expected.forEach(checkJSONPrimitive);
    return claimCheck(isClaimIncluded(claim, expected), `Unexpected '${claim}' value`);
};
export const claimEquals = (claim, expected) => {
    if (typeof claim !== 'string') {
        throw new TypeError("'claim' must be a string");
    }
    checkJSONPrimitive(expected);
    return claimCheck((payload) => {
        if (!(claim in payload)) {
            throw new InvalidTokenError(`Missing '${claim}' claim`);
        }
        return payload[claim] === expected;
    }, `Unexpected '${claim}' value`);
};
export const claimCheck = (fn, errMsg) => {
    if (typeof fn !== 'function') {
        throw new TypeError("'claimCheck' expects a function");
    }
    return (payload) => {
        if (!payload) {
            throw new UnauthorizedError();
        }
        if (!fn(payload)) {
            throw new InvalidTokenError(errMsg);
        }
    };
};
