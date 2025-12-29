import cron from 'node-cron';
import { redisClient } from './redis.service.js';
import { processOrderCreation } from './order.service.js';
import { getOrderStatus } from '../repositories/order.query.js';
import { fshipService } from './fship.service.js';

async function connectRedis() {
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }
}

export const initCronJobs = () => {
    // 0 0/3 * * *
    cron.schedule('* * * * *', async () => {
        try {
            await connectRedis();

            const lockKey = 'cron_retry_failed_orders_lock';
            const acquired = await redisClient.set(lockKey, 'locked', {
                NX: true,
                EX: 55 * 3
            });

            if (!acquired) {
                return;
            }

            console.log('Running cron job (Lock acquired)');
            try {

                const failedOrders = await redisClient.lRange('failed_orders', 0, -1);

                if (failedOrders.length === 0) {
                    console.log('No failed orders to retry.');
                    return;
                }

                console.log(`Found ${failedOrders.length} failed orders to retry.`);


                await redisClient.del('failed_orders')


                const UniquefailedOrders = [...new Set(failedOrders)];
                console.log("UniquefailedOrders",UniquefailedOrders);

                const retryPromises = UniquefailedOrders.map(async (orderStr) => {
                    try {
                        const { orderData:orderId, warehouseId:warehouseId } = JSON.parse(orderStr);


                        console.log(`Retrying order: ${orderId}`);
                        const result = await processOrderCreation(orderId, warehouseId);

                        if (result.status) {
                            console.log(`Order ${orderId} retried successfully.`);
                        } else {
                            console.log(`Order ${orderId} retry failed: ${result.message}`);
                        }
                    } catch (parseError) {
                        console.error('Error parsing failed order log:', parseError);
                    }
                });

                await Promise.allSettled(retryPromises);
                console.log('Finished processing all retries in this cycle.');
            } catch (error) {
                console.error('Error in cron job logic:', error);
            }
        } catch (error) {
            console.error('Error in cron job lock/system:', error);
        }
    });
    //    cron.schedule('0 0/1 * * *', async () => {
    //     try {
    //         await connectRedis();

    //         const lockKey = 'cron_order_status_lock';
    //         const acquired = await redisClient.set(lockKey, 'locked', {
    //             NX: true,
    //             EX: 55 * 3
    //         });

    //         if (!acquired) {
    //             return;
    //         }

    //         console.log('Running cron job (Lock acquired) for order status update');
    //         try {

    //           const row=await getOrderStatus();
    //           const waybill=await Promise.allSettled([row[0].map(async(item:any)=>fshipService.getPickupDetails({waybill:item.waybill}))])

             

    //             console.log('Finished processing all retries in this cycle.');
    //         } catch (error) {
    //             console.error('Error in cron job logic:', error);
    //         }
    //     } catch (error) {
    //         console.error('Error in cron job lock/system:', error);
    //     }
    // });

    console.log('Cron jobs initialized (Retry failed orders every 3 hours)');
};
