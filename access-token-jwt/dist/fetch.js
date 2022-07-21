import { get as getHttp } from 'http';
import { get as getHttps } from 'https';
import { once } from 'events';
import { TextDecoder } from 'util';
const decoder = new TextDecoder();
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
    'https:': getHttps,
    'http:': getHttp,
};
const fetch = async (url, { agent, timeoutDuration: timeout }) => {
    const req = protocols[url.protocol](url.href, {
        agent,
        timeout,
    });
    const [response] = await once(req, 'response');
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
export default fetch;
