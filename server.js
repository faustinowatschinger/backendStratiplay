// server.js
import express from 'express';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import path from 'path';
import chatCustomPrompt from './routes/chat.js';
import paypalWebhook from './routes/paypalWebhook.js';
import createSubscription from './routes/createSubscription.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Otras rutas (por ejemplo, chat)
app.use('/api/chat', chatCustomPrompt);
app.use('/api/paypal', paypalWebhook);
app.use('/api/mercadopago', createSubscription);
// Archivos estáticos
app.use(express.static(path.join(__dirname, 'build')));

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Servidor en http://0.0.0.0:${port}`);
});
