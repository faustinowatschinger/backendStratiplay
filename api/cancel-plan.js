import express from 'express';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Importar 'node-fetch' dinámicamente para ESM
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Configuración de PayPal
import dotenv from 'dotenv';
dotenv.config(); // Asegúrate de que las variables se carguen al inicio

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_API = 'https://api-m.sandbox.paypal.com'; // Usar 'sandbox' para pruebas

const router = express.Router();
const db = getFirestore();

// Obtener el token de acceso de PayPal
async function getAccessToken() {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64');

  const response = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();

  console.log('Respuesta de PayPal:', data); // LOG PARA DEPURACIÓN

  if (!data.access_token) {
    throw new Error('Error al obtener el token de acceso de PayPal');
  }
  return data.access_token;
}

router.post('/cancel-plan', async (req, res) => {
  const { subscriptionId } = req.body;

  if (!subscriptionId) {
    return res.status(400).json({ success: false, message: 'Falta el subscriptionId' });
  }

  try {
    // Obtener el token de acceso
    const accessToken = await getAccessToken();

    // Cancelar la suscripción en PayPal
    const response = await fetch(`${PAYPAL_API}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason: 'El usuario solicitó la cancelación',
      }),
    });
    
    const result = await response.json();
    console.log('Respuesta cancelación:', result); // LOG DE RESPUESTA
    
    if (!response.ok) {
      throw new Error(`Error de PayPal: ${JSON.stringify(result)}`);
    }

    // Actualizar el estado de la suscripción en Firestore
    const auth = getAuth();
    const user = await auth.getUser(subscriptionId); // Relacionar el ID con el usuario
    await db.collection('users').doc(user.uid).update({
      subscriptionStatus: 'canceled',
    });

    res.status(200).json({ success: true, message: 'Suscripción cancelada correctamente' });
  } catch (error) {
    console.error('Error al cancelar la suscripción:', error.message);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// Exportar el router para ES Modules
export default router;