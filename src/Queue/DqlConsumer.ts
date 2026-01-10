import { createChannel, WAREHOUSE_DLQ } from "./rabbitmq.js";

export const DqlConsumer = async () => {
  const channel = await createChannel();

  channel.prefetch(5);

  channel.consume(
    WAREHOUSE_DLQ,
    async (msg: any) => {
      if (!msg) return;

      const payload = JSON.parse(msg.content.toString());
      const headers = msg.properties.headers || {};

      console.error("DLQ MESSAGE");
      console.error("Payload:", payload);
      console.error("Headers:", headers);

     

      channel.ack(msg); // ✅ IMPORTANT
    },
    { noAck: false }
  );
};
