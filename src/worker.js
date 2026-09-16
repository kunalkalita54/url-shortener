import 'dotenv/config';
import {UAParser} from 'ua-parser-js';
import { Worker } from 'bullmq';
import { redisConnection } from './config/redis.js';
import connectDB from './config/database.js';
import Click from './models/click.model.js';


connectDB();

async function start() {
  await connectDB();

  const worker = new Worker('analytics-queue', async (job) => {
    
    const parser = new UAParser(job.data.userAgent);
    const { type: device = 'desktop' } = parser.getDevice();
    const { name: browser } = parser.getBrowser();
        
    await Click.create({
      shortCode: job.data.shortCode,
      timestamp: job.data.timestamp,
      ip: job.data.ip,
      userAgent: job.data.userAgent,
      device,
      browser,
      referrer: job.data.referrer
    });
  console.log('Saved click for', job.data.shortCode);
  }, { connection: redisConnection });

  worker.on('completed', job => console.log(`Job ${job.id} done`));
  worker.on('failed', (job, err) => console.error(`Job ${job.id} failed:`, err.message));
}

start();

