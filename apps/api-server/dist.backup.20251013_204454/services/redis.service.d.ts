export declare class RedisService {
    private static instance;
    private redis;
    private constructor();
    static getInstance(): RedisService;
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttl?: number): Promise<boolean>;
    del(key: string): Promise<boolean>;
    exists(key: string): Promise<boolean>;
    expire(key: string, seconds: number): Promise<boolean>;
    hget(key: string, field: string): Promise<string | null>;
    hset(key: string, field: string, value: string): Promise<boolean>;
    hgetall(key: string): Promise<Record<string, string> | null>;
    incr(key: string): Promise<number>;
    incrby(key: string, increment: number): Promise<number>;
    sadd(key: string, member: string): Promise<number>;
    scard(key: string): Promise<number>;
    flushdb(): Promise<void>;
    disconnect(): Promise<void>;
}
//# sourceMappingURL=redis.service.d.ts.map