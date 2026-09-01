import 'dotenv/config';
import { Worker } from 'bullmq';
import { redisConnection } from './config/redis.js';
import connectDB from './config/database.js';
import Click from './models/click.model.js';

connectDB();

const worker = new Worker('analytics-queue', async (job) => {
  await Click.create({
    shortCode: job.data.shortCode,
    timestamp: job.data.timestamp,
    ip: job.data.ip,
    userAgent: job.data.userAgent
  });
  console.log('Saved click for', job.data.shortCode);
}, { connection: redisConnection });

worker.on('completed', job => console.log(`Job ${job.id} done`));
worker.on('failed', (job, err) => console.error(`Job ${job.id} failed:`, err.message));
