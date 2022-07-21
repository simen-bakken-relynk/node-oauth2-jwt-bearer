export declare class UnauthorizedError extends Error {
    status: number;
    statusCode: number;
    headers: {
        'WWW-Authenticate': string;
    };
    constructor(message?: string);
}
export declare class InvalidRequestError extends UnauthorizedError {
    code: string;
    status: number;
    statusCode: number;
    constructor(message?: string);
}
export declare class InvalidTokenError extends UnauthorizedError {
    code: string;
    status: number;
    statusCode: number;
    constructor(message?: string);
}
export declare class InsufficientScopeError extends UnauthorizedError {
    code: string;
    status: number;
    statusCode: number;
    constructor(scopes?: string[], message?: string);
}
