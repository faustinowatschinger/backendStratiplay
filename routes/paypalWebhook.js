import express from 'express';
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

import serviceAccount from '../config/tu-firebase-adminsdk.json' assert { type: 'json' };

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const dbAdmin = admin.firestore();
const router = express.Router();

// Endpoint para recibir webhooks de PayPal
router.post('/paypal-webhook', async (req, res) => {
  // Aquí puedes verificar las cabeceras para validar la autenticidad del webhook
  // Por ejemplo: req.headers['paypal-transmission-sig'], etc.

  const event = req.body;
  console.log("Webhook de PayPal recibido:", JSON.stringify(event, null, 2));

  try {
    // Extraer datos relevantes, por ejemplo:
    const eventType = event.event_type;
    const subscriptionData = event.resource; // Los datos de la suscripción
    const subscriptionID = subscriptionData.id;
    // Suponiendo que guardaste el idUsuario en tus datos personalizados
    const idUsuario = subscriptionData.custom_id; // O external_reference, según tu configuración

    if (!subscriptionID || !idUsuario) {
      console.log("Faltan datos en el webhook de PayPal.");
      return res.status(400).send("Faltan datos");
    }

    // Buscar la suscripción en Firestore o utilizar el idUsuario para actualizar directamente
    // En este ejemplo, asumimos que en Firestore tienes la suscripción asociada al usuario
    const subscriptionDoc = await dbAdmin.collection('subscriptions').doc(subscriptionID).get();
    if (!subscriptionDoc.exists) {
      console.log("No se encontró la suscripción:", subscriptionID);
      return res.status(400).send("Suscripción no encontrada");
    }
    const subscriptionInfo = subscriptionDoc.data();
    const newPlan = subscriptionInfo.plan;

    if (newPlan) {
      // Actualizar el plan del usuario en Firestore
      await dbAdmin.collection('usuarios').doc(idUsuario).update({ plan: newPlan });
      console.log(`Plan actualizado a ${newPlan} para el usuario ${idUsuario}`);

      // Opcional: actualizar el estado de la suscripción en Firestore
      await dbAdmin.collection('subscriptions').doc(subscriptionID).update({ status: subscriptionData.status });
      res.status(200).send("Webhook procesado correctamente.");
    } else {
      console.log("No se encontró plan asociado en la suscripción.");
      res.status(400).send("Plan no definido en la suscripción");
    }
  } catch (error) {
    console.error("Error al procesar el webhook de PayPal:", error);
    res.status(500).send("Error interno");
  }
});

export default router;
