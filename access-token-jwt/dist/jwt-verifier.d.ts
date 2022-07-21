/// <reference types="node" />
/// <reference types="node" />
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';
import type { JWTPayload, JWSHeaderParameters } from 'jose';
import { Validators } from './validate';
export interface JwtVerifierOptions {
    issuerBaseURL?: string;
    audience?: string | string[];
    issuer?: string;
    jwksUri?: string;
    agent?: HttpAgent | HttpsAgent;
    cooldownDuration?: number;
    timeoutDuration?: number;
    validators?: Partial<Validators>;
    clockTolerance?: number;
    maxTokenAge?: number;
    strict?: boolean;
    secret?: string;
    tokenSigningAlg?: string;
}
export interface VerifyJwtResult {
    header: JWSHeaderParameters;
    payload: JWTPayload;
    token: string;
}
export declare type VerifyJwt = (jwt: string) => Promise<VerifyJwtResult>;
declare const jwtVerifier: ({ issuerBaseURL, jwksUri, issuer, audience, secret, tokenSigningAlg, agent, cooldownDuration, timeoutDuration, clockTolerance, maxTokenAge, strict, validators: customValidators, }: JwtVerifierOptions) => VerifyJwt;
export default jwtVerifier;
export { JWTPayload, JWSHeaderParameters };
