import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';
import chatCustomPrompt from './routes/chat.js';
import cancelPlanRouter from './api/cancel-plan.js';

const app = express();
const port = process.env.PORT || 5000;

const corsOptions = {
  origin: 'https://stratiplay.com', // Reemplaza con tu dominio
  optionsSuccessStatus: 200,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: 'Content-Type,Authorization',
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware para manejar solicitudes preflight
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', 'https://stratiplay.com');
  res.header('Access-Control-Allow-Methods', 'POST, GET, DELETE, PUT, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Max-Age', '1728000');
  res.sendStatus(204);
});

app.use('/api/chat', chatCustomPrompt);
app.use('/api', cancelPlanRouter);

// Sirve archivos estáticos desde el directorio de build

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${port}`);
});