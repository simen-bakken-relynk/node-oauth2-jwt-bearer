import type { JWTPayload, JWSHeaderParameters } from 'jose';
export declare type FunctionValidator = (value: unknown, claims: JWTPayload, header: JWSHeaderParameters) => Promise<boolean> | boolean;
export declare type Validator = FunctionValidator | string | false | undefined;
export interface Validators {
    alg: Validator;
    typ: Validator;
    iss: Validator;
    aud: Validator;
    exp: Validator;
    iat: Validator;
    sub: Validator;
    client_id: Validator;
    jti: Validator;
    [key: string]: Validator;
}
declare const _default: (payload: JWTPayload, header: JWSHeaderParameters, validators: Validators) => Promise<void[]>;
export default _default;
export declare const defaultValidators: (issuer: string, audience: string | string[], clockTolerance: number, maxTokenAge: number | undefined, strict: boolean, allowedSigningAlgs: string[] | undefined, tokenSigningAlg: string | undefined) => Validators;
