import { redisConnection } from "../config/redis.js";

export async function rateLimiter(req,res,next) {
    const ip= req.ip;
    const limit=10;
    const windowSecs=60;

    const now= Math.floor(Date.now()/1000);
    const windowStart= now-windowSecs;

    const key= `rate_limit:sliding:${ip}`;

    try {
        const results= await redisConnection
        .multi()

        .zremrangebyscore(key, 0, windowStart)

        .zadd(key, now, `${now}:${Math.random()}`)

        .zcard(key)

        .expire(key, windowSecs)
        .exec();

        const requestCount= results[2];

        if(requestCount>limit) {
            return res.status(429).json({error: 'Too many requests. Please try again in a minute'});
        }

        next();

    } catch (error) {
        console.error("Redis Rate Limiter Error:", error);
        next();
    }
}
