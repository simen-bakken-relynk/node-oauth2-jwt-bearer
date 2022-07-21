/// <reference types="node" />
/// <reference types="node" />
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';
export interface IssuerMetadata {
    issuer: string;
    jwks_uri: string;
    id_token_signing_alg_values_supported?: string[];
    [key: string]: unknown;
}
export interface DiscoverOptions {
    agent?: HttpAgent | HttpsAgent;
    timeoutDuration?: number;
}
declare const discover: (uri: string, { agent, timeoutDuration }?: DiscoverOptions) => Promise<IssuerMetadata>;
export default discover;
