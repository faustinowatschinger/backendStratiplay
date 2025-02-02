import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { handler as createPlanHandler } from './api/create-plan.js';
import chatCustomPrompt from './routes/chat.js';
import cancelPlanRouter from './api/cancel-plan.js';

const app = express();
const port = process.env.PORT || 5000;

// Configuración de CORS para permitir solicitudes desde https://stratiplay.com
const corsOptions = {
  origin: 'https://stratiplay.com',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

// Middleware para habilitar CORS
app.use(cors(corsOptions));

// Middleware para parsear JSON y datos urlencoded
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Definición de rutas
app.post('/backend/api/create-plan', createPlanHandler);
app.use('/api/chat', chatCustomPrompt);
app.use('/api', cancelPlanRouter);

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});