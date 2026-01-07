import express from 'express';
import dotenv from 'dotenv';
import shipmentRoutes from './routes/shipment.routes.js';
import pool from './config/db.config.js';
import { initCronJobs } from './services/cron.service.js';
import { connectRedis } from './services/redis.service.js';
import http from "http";
import os from "os";
import cors from 'cors';
import cluster from 'cluster';

dotenv.config();
const cpuUsage = os.cpus().length;

if (cluster.isPrimary && false) {
    console.log(`Master ${process.pid} is running`);

    // Fork workers.
    for (let i = 0; i < cpuUsage; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`worker ${worker.process.pid} died`);
    });
} else {

    const app = express();
    const server = http.createServer(app);
    const PORT = process.env.PORT || 3000;

    app.use(cors({ origin: "*" }));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.use('/api', shipmentRoutes);


    server.listen(PORT, async () => {
        console.log(`Server is running on port ${PORT}`);
        console.log(`Fship API Base URL: ${process.env.FSHIP_BASE_URL}`);

        try {
            const connection = await pool.getConnection();
            console.log('Successfully connected to MySQL database');
            connection.release();
            await connectRedis();
            initCronJobs();
        } catch (err) {
            console.error('Error connecting to MySQL database:', err);
        }
    });

}