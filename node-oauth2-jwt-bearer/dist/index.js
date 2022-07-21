'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var assert = require('assert');
var buffer = require('buffer');
var crypto = require('crypto');
var url = require('url');
var jose = require('jose');
var http = require('http');
var https = require('https');
var events = require('events');
var util = require('util');

class UnauthorizedError extends Error {
    constructor(message = 'Unauthorized') {
        super(message);
        this.status = 401;
        this.statusCode = 401;
        this.headers = { 'WWW-Authenticate': 'Bearer realm="api"' };
        this.name = this.constructor.name;
    }
}
class InvalidRequestError extends UnauthorizedError {
    constructor(message = 'Invalid Request') {
        super(message);
        this.code = 'invalid_request';
        this.status = 400;
        this.statusCode = 400;
        this.headers = getHeaders(this.code, this.message);
    }
}
class InvalidTokenError extends UnauthorizedError {
    constructor(message = 'Invalid Token') {
        super(message);
        this.code = 'invalid_token';
        this.status = 401;
        this.statusCode = 401;
        this.headers = getHeaders(this.code, this.message);
    }
}
class InsufficientScopeError extends UnauthorizedError {
    constructor(scopes, message = 'Insufficient Scope') {
        super(message);
        this.code = 'insufficient_scope';
        this.status = 403;
        this.statusCode = 403;
        this.headers = getHeaders(this.code, this.message, scopes);
    }
}
const getHeaders = (error, description, scopes) => ({
    'WWW-Authenticate': `Bearer realm="api", error="${error}", error_description="${description.replace(/"/g, "'")}"${(scopes && `, scope="${scopes.join(' ')}"`) || ''}`,
});

const TOKEN_RE = /^Bearer (.+)$/i;
const getTokenFromHeader = (headers) => {
    if (typeof headers.authorization !== 'string') {
        return;
    }
    const match = headers.authorization.match(TOKEN_RE);
    if (!match) {
        return;
    }
    return match[1];
};
const getTokenFromQuery = (query) => {
    const accessToken = query === null || query === void 0 ? void 0 : query.access_token;
    if (typeof accessToken === 'string') {
        return accessToken;
    }
};
const getFromBody = (body, urlEncoded) => {
    const accessToken = body === null || body === void 0 ? void 0 : body.access_token;
    if (typeof accessToken === 'string' && urlEncoded) {
        return accessToken;
    }
};
function getToken(headers, query, body, urlEncoded) {
    const fromHeader = getTokenFromHeader(headers);
    const fromQuery = getTokenFromQuery(query);
    const fromBody = getFromBody(body, urlEncoded);
    if (!fromQuery && !fromHeader && !fromBody) {
        throw new UnauthorizedError();
    }
    if (+!!fromQuery + +!!fromBody + +!!fromHeader > 1) {
        throw new InvalidRequestError('More than one method used for authentication');
    }
    return (fromQuery || fromBody || fromHeader);
}

const decoder = new util.TextDecoder();
const concat = (...buffers) => {
    const size = buffers.reduce((acc, { length }) => acc + length, 0);
    const buf = new Uint8Array(size);
    let i = 0;
    buffers.forEach((buffer) => {
        buf.set(buffer, i);
        i += buffer.length;
    });
    return buf;
};
const protocols = {
    'https:': https.get,
    'http:': http.get,
};
const fetch = async (url, { agent, timeoutDuration: timeout }) => {
    const req = protocols[url.protocol](url.href, {
        agent,
        timeout,
    });
    const [response] = await events.once(req, 'response');
    if (response.statusCode !== 200) {
        throw new Error(`Failed to fetch ${url.href}, responded with ${response.statusCode}`);
    }
    const parts = [];
    for await (const part of response) {
        parts.push(part);
    }
    try {
        return JSON.parse(decoder.decode(concat(...parts)));
    }
    catch (err) {
        throw new Error(`Failed to parse the response from ${url.href}`);
    }
};

const OIDC_DISCOVERY = '/.well-known/openid-configuration';
const OAUTH2_DISCOVERY = '/.well-known/oauth-authorization-server';
const assertIssuer = (data) => assert.strict(data.issuer, `'issuer' not found in authorization server metadata`);
const discover = async (uri, { agent, timeoutDuration } = {}) => {
    const url$1 = new url.URL(uri);
    if (url$1.pathname.includes('/.well-known/')) {
        const data = await fetch(url$1, { agent, timeoutDuration });
        assertIssuer(data);
        return data;
    }
    const pathnames = [];
    if (url$1.pathname.endsWith('/')) {
        pathnames.push(`${url$1.pathname}${OIDC_DISCOVERY.substring(1)}`);
    }
    else {
        pathnames.push(`${url$1.pathname}${OIDC_DISCOVERY}`);
    }
    if (url$1.pathname === '/') {
        pathnames.push(`${OAUTH2_DISCOVERY}`);
    }
    else {
        pathnames.push(`${OAUTH2_DISCOVERY}${url$1.pathname}`);
    }
    for (const pathname of pathnames) {
        try {
            const wellKnownUri = new url.URL(pathname, url$1);
            const data = await fetch(wellKnownUri, {
                agent,
                timeoutDuration,
            });
            assertIssuer(data);
            return data;
        }
        catch (err) {
        }
    }
    throw new Error('Failed to fetch authorization server metadata');
};

var validate = (payload, header, validators) => Promise.all(Object.entries(validators).map(async ([key, validator]) => {
    const value = key === 'alg' || key === 'typ' ? header[key] : payload[key];
    if (validator === false ||
        (typeof validator === 'string' && value === validator) ||
        (typeof validator === 'function' &&
            (await validator(value, payload, header)))) {
        return;
    }
    throw new Error(`Unexpected '${key}' value`);
}));
const defaultValidators = (issuer, audience, clockTolerance, maxTokenAge, strict, allowedSigningAlgs, tokenSigningAlg) => ({
    alg: (alg) => typeof alg === 'string' &&
        alg.toLowerCase() !== 'none' &&
        (!allowedSigningAlgs || allowedSigningAlgs.includes(alg)) &&
        (!tokenSigningAlg || alg === tokenSigningAlg),
    typ: (typ) => !strict ||
        (typeof typ === 'string' &&
            typ.toLowerCase().replace(/^application\//, '') === 'at+jwt'),
    iss: (iss) => iss === issuer,
    aud: (aud) => {
        audience = typeof audience === 'string' ? [audience] : audience;
        if (typeof aud === 'string') {
            return audience.includes(aud);
        }
        if (Array.isArray(aud)) {
            return audience.some(Set.prototype.has.bind(new Set(aud)));
        }
        return false;
    },
    exp: (exp) => {
        const now = Math.floor(Date.now() / 1000);
        return typeof exp === 'number' && exp >= now - clockTolerance;
    },
    iat: (iat) => {
        if (!maxTokenAge) {
            return (iat === undefined && !strict) || typeof iat === 'number';
        }
        const now = Math.floor(Date.now() / 1000);
        return (typeof iat === 'number' &&
            iat < now + clockTolerance &&
            iat > now - clockTolerance - maxTokenAge);
    },
    sub: (sub) => (sub === undefined && !strict) || typeof sub === 'string',
    client_id: (clientId) => (clientId === undefined && !strict) || typeof clientId === 'string',
    jti: (jti) => (jti === undefined && !strict) || typeof jti === 'string',
});

const ASYMMETRIC_ALGS = [
    'RS256',
    'RS384',
    'RS512',
    'PS256',
    'PS384',
    'PS512',
    'ES256',
    'ES256K',
    'ES384',
    'ES512',
    'EdDSA',
];
const SYMMETRIC_ALGS = ['HS256', 'HS384', 'HS512'];
const jwtVerifier = ({ issuerBaseURL = process.env.ISSUER_BASE_URL, jwksUri = process.env.JWKS_URI, issuer = process.env.ISSUER, audience = process.env.AUDIENCE, secret = process.env.SECRET, tokenSigningAlg = process.env.TOKEN_SIGNING_ALG, agent, cooldownDuration = 30000, timeoutDuration = 5000, clockTolerance = 5, maxTokenAge, strict = false, validators: customValidators, }) => {
    let origJWKS;
    let discovery;
    let validators;
    let allowedSigningAlgs;
    assert.strict(issuerBaseURL || (issuer && jwksUri) || (issuer && secret), "You must provide an 'issuerBaseURL', an 'issuer' and 'jwksUri' or an 'issuer' and 'secret'");
    assert.strict(!(secret && jwksUri), "You must not provide both a 'secret' and 'jwksUri'");
    assert.strict(audience, "An 'audience' is required to validate the 'aud' claim");
    assert.strict(!secret || (secret && tokenSigningAlg), "You must provide a 'tokenSigningAlg' for validating symmetric algorithms");
    assert.strict(secret || !tokenSigningAlg || ASYMMETRIC_ALGS.includes(tokenSigningAlg), `You must supply one of ${ASYMMETRIC_ALGS.join(', ')} for 'tokenSigningAlg' to validate asymmetrically signed tokens`);
    assert.strict(!secret || (tokenSigningAlg && SYMMETRIC_ALGS.includes(tokenSigningAlg)), `You must supply one of ${SYMMETRIC_ALGS.join(', ')} for 'tokenSigningAlg' to validate symmetrically signed tokens`);
    const secretKey = secret && crypto.createSecretKey(buffer.Buffer.from(secret));
    const JWKS = async (...args) => {
        if (secretKey)
            return secretKey;
        if (!origJWKS) {
            origJWKS = jose.createRemoteJWKSet(new url.URL(jwksUri), {
                agent,
                cooldownDuration,
                timeoutDuration,
            });
        }
        return origJWKS(...args);
    };
    return async (jwt) => {
        try {
            if (issuerBaseURL) {
                discovery =
                    discovery || discover(issuerBaseURL, { agent, timeoutDuration });
                ({
                    jwks_uri: jwksUri,
                    issuer,
                    id_token_signing_alg_values_supported: allowedSigningAlgs,
                } = await discovery);
            }
            validators || (validators = {
                ...defaultValidators(issuer, audience, clockTolerance, maxTokenAge, strict, allowedSigningAlgs, tokenSigningAlg),
                ...customValidators,
            });
            const { payload, protectedHeader: header } = await jose.jwtVerify(jwt, JWKS);
            await validate(payload, header, validators);
            return { payload, header, token: jwt };
        }
        catch (e) {
            throw new InvalidTokenError(e.message);
        }
    };
};

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
const requiredScopes$1 = (scopes) => {
    if (typeof scopes === 'string') {
        scopes = scopes.split(' ');
    }
    else if (!Array.isArray(scopes)) {
        throw new TypeError("'scopes' must be a string or array of strings");
    }
    const fn = isClaimIncluded('scope', scopes);
    return claimCheck$1((payload) => {
        if (!('scope' in payload)) {
            throw new InsufficientScopeError(scopes, "Missing 'scope' claim");
        }
        if (!fn(payload)) {
            throw new InsufficientScopeError(scopes);
        }
        return true;
    });
};
const claimIncludes$1 = (claim, ...expected) => {
    if (typeof claim !== 'string') {
        throw new TypeError("'claim' must be a string");
    }
    expected.forEach(checkJSONPrimitive);
    return claimCheck$1(isClaimIncluded(claim, expected), `Unexpected '${claim}' value`);
};
const claimEquals$1 = (claim, expected) => {
    if (typeof claim !== 'string') {
        throw new TypeError("'claim' must be a string");
    }
    checkJSONPrimitive(expected);
    return claimCheck$1((payload) => {
        if (!(claim in payload)) {
            throw new InvalidTokenError(`Missing '${claim}' claim`);
        }
        return payload[claim] === expected;
    }, `Unexpected '${claim}' value`);
};
const claimCheck$1 = (fn, errMsg) => {
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

const auth = (opts = {}) => {
    const verifyJwt = jwtVerifier(opts);
    return async (req, res, next) => {
        try {
            const jwt = getToken(req.headers, req.query, req.body, !!req.is('urlencoded'));
            req.auth = await verifyJwt(jwt);
            next();
        }
        catch (e) {
            next(e);
        }
    };
};
const toHandler = (fn) => (req, res, next) => {
    var _a;
    try {
        fn((_a = req.auth) === null || _a === void 0 ? void 0 : _a.payload);
        next();
    }
    catch (e) {
        next(e);
    }
};
const claimCheck = (...args) => toHandler(claimCheck$1(...args));
const claimEquals = (...args) => toHandler(claimEquals$1(...args));
const claimIncludes = (...args) => toHandler(claimIncludes$1(...args));
const requiredScopes = (...args) => toHandler(requiredScopes$1(...args));

exports.InsufficientScopeError = InsufficientScopeError;
exports.InvalidRequestError = InvalidRequestError;
exports.InvalidTokenError = InvalidTokenError;
exports.UnauthorizedError = UnauthorizedError;
exports.auth = auth;
exports.claimCheck = claimCheck;
exports.claimEquals = claimEquals;
exports.claimIncludes = claimIncludes;
exports.requiredScopes = requiredScopes;
