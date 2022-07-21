declare type QueryLike = Record<string, unknown> & {
    access_token?: string;
};
declare type BodyLike = QueryLike;
declare type HeadersLike = Record<string, unknown> & {
    authorization?: string;
    'content-type'?: string;
};
export default function getToken(headers: HeadersLike, query?: QueryLike, body?: BodyLike, urlEncoded?: boolean): string;
export {};
