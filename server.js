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
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  allowedHeaders: 'Content-Type,Authorization',
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware para manejar solicitudes preflight
app.options('*', cors(corsOptions));

// Rutas de la API
app.use('/api/chat', chatCustomPrompt);
app.use('/api', cancelPlanRouter);

// Sirve archivos estáticos desde el directorio de build
app.use(express.static(path.join(__dirname, 'build')));

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${port}`);
});