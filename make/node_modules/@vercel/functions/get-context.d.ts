import { RuntimeCache } from './cache/types';
import { PurgeApi } from './purge/types';
import { AddCacheTagApi } from './addcachetag/types';
type Context = {
    waitUntil?: (promise: Promise<unknown>) => void;
    cache?: RuntimeCache;
    purge?: PurgeApi;
    addCacheTag?: AddCacheTagApi;
    headers?: Record<string, string>;
};
export declare const SYMBOL_FOR_REQ_CONTEXT: unique symbol;
export declare function getContext(): Context;
export {};
