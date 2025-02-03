import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';
import admin from 'firebase-admin';
import serviceAccount from './config/ordo-62889-firebase-adminsdk-zl2wb-dd93e17d22.json' assert { type: 'json' };
import chatCustomPrompt from './routes/chat.js';
import cancelPlanRouter from './api/cancel-plan.js';

// Inicializar Firebase primero
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

// Verificar conexión con Firestore
admin.firestore().collection('test').doc('test').get()
  .then(() => console.log('✓ Firebase conectado'))
  .catch(error => console.error('✗ Error Firebase:', error));

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
app.use((req, res, next) => {
  res.header('Access-Control-Expose-Headers', 'Authorization');
  next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.options('*', cors(corsOptions));

// Rutas
app.use('/api/chat', chatCustomPrompt);
app.use('/api', cancelPlanRouter);

// Archivos estáticos
app.use(express.static(path.join(__dirname, 'build')));

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Servidor en http://0.0.0.0:${port}`);
});