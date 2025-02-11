// server.js
import express from 'express';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import path from 'path';
import mercadoPagoRoutes from './routes/mercadopago.js'; // Importa las rutas de Mercado Pago
import chatCustomPrompt from './routes/chat.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Rutas de Mercado Pago para la suscripción
app.use('/api/mercadopago', mercadoPagoRoutes);

// Otras rutas (por ejemplo, chat)
app.use('/api/chat', chatCustomPrompt);

// Archivos estáticos
app.use(express.static(path.join(__dirname, 'build')));

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Servidor en http://0.0.0.0:${port}`);
});
