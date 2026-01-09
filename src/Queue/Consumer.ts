import { AddHouseInDB } from "../repositories/WareHouse.query.js";
import { createChannel,WAREHOUSE_QUEUE,WAREHOUSE_RETRY_QUEUE,WAREHOUSE_DLQ } from "./rabbitmq.js";

export const AddWarehouseConsumer = async () => {
  const channel = await createChannel();

  const MAX_RETRIES = 3;
  channel.prefetch(1);

  channel.consume(
    WAREHOUSE_QUEUE,
    async (msg: any) => {
      if (!msg) return;

      const headers = msg.properties.headers || {};
      const retryCount = headers["x-retry-count"] || 0;

      try {
        const payload = JSON.parse(msg.content.toString());
        await AddHouseInDB(payload.warehouseTable_id, payload.warehouseId);
        channel.ack(msg);
      } catch (err: any) {
        if (retryCount >= MAX_RETRIES) {
          channel.sendToQueue(
            WAREHOUSE_DLQ,
            msg.content,
            {
              headers: {
                "x-retry-count": retryCount,
                "x-error": err?.message,
              },
              persistent: true,
            }
          );
        } else {
          channel.sendToQueue(
            WAREHOUSE_RETRY_QUEUE,
            msg.content,
            {
              headers: {
                "x-retry-count": retryCount + 1,
              },
              persistent: true,
            }
          );
        }

        channel.ack(msg);
      }
    },
    { noAck: false }
  );
};
