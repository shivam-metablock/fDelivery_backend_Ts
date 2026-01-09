import amqp from "amqplib";

let connection: amqp.Connection | null = null;

const WAREHOUSE_QUEUE = "add_warehouse";
const WAREHOUSE_RETRY_QUEUE = "add_warehouse_retry";
const WAREHOUSE_DLQ = "add_warehouse_dlq";
const WAREHOUSE_EXCHANGE = "add_warehouse_exchange";

export const getConnection = async () => {
  if (!connection) {
      //@ts-ignore
    connection = await amqp.connect(
      process.env.RABBITMQ_URL || "amqp://localhost:5672"
    );
  }
  return connection;
};

export const createChannel = async () => {
  const conn = await getConnection();
  //@ts-ignore
  const channel = await conn.createChannel();

 
  await channel.assertExchange(WAREHOUSE_EXCHANGE, "direct", { durable: true });

  
  await channel.assertQueue(WAREHOUSE_DLQ, { durable: true });

  await channel.assertQueue(WAREHOUSE_RETRY_QUEUE, {
    durable: true,
    arguments: {
      "x-message-ttl": 5000, // 5 seconds delay
      "x-dead-letter-exchange": WAREHOUSE_EXCHANGE,
      "x-dead-letter-routing-key": WAREHOUSE_QUEUE,
    },
  });

  await channel.assertQueue(WAREHOUSE_QUEUE, {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": WAREHOUSE_EXCHANGE,
      "x-dead-letter-routing-key": WAREHOUSE_RETRY_QUEUE,
    },
  });

  await channel.bindQueue(WAREHOUSE_QUEUE, WAREHOUSE_EXCHANGE, WAREHOUSE_QUEUE);
  await channel.bindQueue(WAREHOUSE_RETRY_QUEUE, WAREHOUSE_EXCHANGE, WAREHOUSE_RETRY_QUEUE);
  await channel.bindQueue(WAREHOUSE_DLQ, WAREHOUSE_EXCHANGE, WAREHOUSE_DLQ);

  return channel;
};

export { WAREHOUSE_QUEUE, WAREHOUSE_RETRY_QUEUE, WAREHOUSE_DLQ, WAREHOUSE_EXCHANGE };
