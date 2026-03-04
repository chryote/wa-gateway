// Rename your file to index.mjs
import "dotenv/config";
import rateLimit from "express-rate-limit"
import express from 'express';
import { Client } from 'whatsapp-web.js';
import cors from 'cors';
import mysql from 'mysql2/promise';
import qrImage from 'qr-image';
import pool from "./db.js";
import { LocalAuth } from 'whatsapp-web.js';

const app = express();
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30
});
const apiKey = process.env.API_KEY;
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});
const port = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

app.use(limiter);
app.post('/send-message', async (req, res) => {
    const { nomor, msg, key } = req.body;
    const minDelaySeconds = 20;
    const maxDelaySeconds = 40;
    const randomDelayMilliseconds = Math.random() * (maxDelaySeconds - minDelaySeconds) * 1000 + minDelaySeconds * 1000;

    if (key !== apiKey) {
        return res.status(401).send('Invalid API key ' + key);
    }

    try {
        const chatId = nomor.substring(1) + '@c.us';
        console.log(chatId);
        await client.sendMessage(chatId, msg);

        console.log('Connected to the database');

        const currentDate = new Date();
        const currentDateString = currentDate.toISOString().split('T')[0];
        const extractedNumbers = nomor.replace(/\D/g, '');

        const dataToInsert = [
            currentDate,
            "Kirim",
            extractedNumbers,
            msg,
            "DISHUB KUDUS"
        ];

        const placeholders = new Array(dataToInsert.length).fill('?').join(', ');

        const query = `INSERT INTO whatsappgateway (tanggal, aksi, nomor, pesan, server) VALUES (${placeholders})`;
        const [rows] = await pool.query(query, dataToInsert);
        console.log('Inserted ' + rows.affectedRows + ' row(s)');

        res.send('Message sent and inserted successfully');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error sending message and inserting into the database');
    }
});
app.get('/get-qr-code', (req, res) => {
    // Check if the client is not ready (no active session)
    if (client.isReady !== "Ready") {
        const qrCode = qrImage.image(client.qrCode);
        res.writeHead(200, { 'Content-Type': 'image/png' });
        qrCode.pipe(res);
    } else {
        // Respond with a message indicating that the client is already linked
        res.json({ message: 'WhatsApp is already linked.' });
    }
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "whatsapp-gateway",
    time: new Date()
  });
});

client.on('qr', (qr) => {
    console.log('QR Code', qr);
    // Save the QR code in the client object
    client.qrCode = qr;
});

client.on('ready', () => {
    console.log('WhatsApp client is ready');
    client.isReady = "Ready";
});

client.on('message', async message => {
    if (message.fromMe) {
        return;
    }

    const currentDate = new Date();
    const nomor = message.from;
    const extractedNumbers = nomor.replace(/\D/g, '');
    const msg = message.body;
    
    const dataToInsert = [
        currentDate,
        "Terima",
        extractedNumbers,
        msg,
        "DISHUB KUDUS"
    ];

    const placeholders = new Array(dataToInsert.length).fill('?').join(', ');

    const query = `INSERT INTO whatsappgateway (tanggal, aksi, nomor, pesan, server) VALUES (${placeholders})`;
    const [rows] = await pool.query(query, dataToInsert);

    console.log('Inserted ' + rows.affectedRows + ' row(s)');
});

client.initialize();

app.listen(port, '127.0.0.1', () => {
    console.log(`Server is listening on port ${port}`);
});
