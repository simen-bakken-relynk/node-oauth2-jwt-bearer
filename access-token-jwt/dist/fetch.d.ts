/// <reference types="node" />
/// <reference types="node" />
import { URL } from 'url';
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';
export interface FetchOptions {
    agent?: HttpAgent | HttpsAgent;
    timeoutDuration?: number;
}
declare const fetch: <TResponse>(url: URL, { agent, timeoutDuration: timeout }: FetchOptions) => Promise<TResponse>;
export default fetch;
