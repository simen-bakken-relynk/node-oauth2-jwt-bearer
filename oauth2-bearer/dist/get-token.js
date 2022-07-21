import { InvalidRequestError, UnauthorizedError } from './errors';
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
export default function getToken(headers, query, body, urlEncoded) {
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
