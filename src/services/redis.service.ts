import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient = createClient({
    url: redisUrl
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

async function connectRedis() {
    if (!redisClient.isOpen) {
        await redisClient.connect();
        console.log('Redis Connected');
    }
}

export const logFailedOrder = async (orderData: any,warehouseId:string) => {
    try {
        await connectRedis();
        await redisClient.lPush('failed_orders', JSON.stringify({orderData,warehouseId}));
        console.log('Failed order logged to Redis');
    } catch (err) {
        console.error('Error logging to Redis:', err);
    }
};
