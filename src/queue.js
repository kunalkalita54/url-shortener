import { Queue } from "bullmq";
import { redisConnection } from './config/redis.js';


const analyticsQueue= new Queue('analytics-queue', {connection: redisConnection});

export async function addClickEvent(data) {
   await analyticsQueue.add('click-event', data)
}

export default {analyticsQueue};