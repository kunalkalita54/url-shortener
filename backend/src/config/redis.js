import Redis from "ioredis";

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

redisConnection.on("error", (err) => console.log("Redis Client Error", err));
redisConnection.on("connect", () => console.log("Connected to Redis"));


export { redisConnection };