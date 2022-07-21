export class UnauthorizedError extends Error {
    constructor(message = 'Unauthorized') {
        super(message);
        this.status = 401;
        this.statusCode = 401;
        this.headers = { 'WWW-Authenticate': 'Bearer realm="api"' };
        this.name = this.constructor.name;
    }
}
export class InvalidRequestError extends UnauthorizedError {
    constructor(message = 'Invalid Request') {
        super(message);
        this.code = 'invalid_request';
        this.status = 400;
        this.statusCode = 400;
        this.headers = getHeaders(this.code, this.message);
    }
}
export class InvalidTokenError extends UnauthorizedError {
    constructor(message = 'Invalid Token') {
        super(message);
        this.code = 'invalid_token';
        this.status = 401;
        this.statusCode = 401;
        this.headers = getHeaders(this.code, this.message);
    }
}
export class InsufficientScopeError extends UnauthorizedError {
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
