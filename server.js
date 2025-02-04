import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import path from 'path';
import chatCustomPrompt from './routes/chat.js';
import cancelPlanRouter from './api/cancel-plan.js';
import progressPlanRouter from './routes/progress-plan.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;

const corsOptions = {
  origin: 'https://stratiplay.com',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400,
  preflightContinue: false
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Rutas
app.use('/api/chat', chatCustomPrompt);
app.use('/api', cancelPlanRouter);
app.use('/api', progressPlanRouter); // Usar el enrutador de progress-plan

// Archivos estáticos
app.use(express.static(path.join(__dirname, 'build')));

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Servidor en http://0.0.0.0:${port}`);
});