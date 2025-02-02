import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import chatCustomPrompt from './routes/chat.js';

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
app.options('*', cors(corsOptions)); // Habilita las solicitudes preflight para todas las rutas

// Middleware para parsear JSON y datos urlencoded
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Definición de rutas
app.use('/api/chat', chatCustomPrompt);

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});