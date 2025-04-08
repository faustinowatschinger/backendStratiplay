import express from 'express';
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

import serviceAccount from '../config/ordo-62889-firebase-adminsdk-zl2wb-dd93e17d22.json' assert { type: 'json' };

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const dbAdmin = admin.firestore();
const router = express.Router();

// Endpoint para recibir webhooks de PayPal
router.post('/paypal-webhook', async (req, res) => {
  // Aquí podrías verificar cabeceras como req.headers['paypal-transmission-sig'] para validar la autenticidad
  const event = req.body;
  console.log("Webhook de PayPal recibido:", JSON.stringify(event, null, 2));

  try {
    const eventType = event.event_type;
    const subscriptionData = event.resource; // Datos de la suscripción
    const subscriptionID = subscriptionData.id;
    // Se asume que guardaste el idUsuario en un campo custom (puede ser custom_id o external_reference)
    const idUsuario = subscriptionData.custom_id; 

    if (!subscriptionID || !idUsuario) {
      console.log("Faltan datos en el webhook de PayPal.");
      return res.status(400).send("Faltan datos");
    }

    // Si el evento es de cancelación o el estado es "CANCELLED", actualiza el plan del usuario a "gratuito"
    if (eventType === "BILLING.SUBSCRIPTION.CANCELLED" || subscriptionData.status === "CANCELLED") {
      await dbAdmin.collection('usuarios').doc(idUsuario).update({ plan: "gratuito" });
      console.log(`Plan del usuario ${idUsuario} actualizado a gratuito por cancelación de la suscripción ${subscriptionID}`);
      // Opcional: actualizar el estado de la suscripción en Firestore
      await dbAdmin.collection('subscriptions').doc(subscriptionID).update({ status: subscriptionData.status });
      return res.status(200).send("Webhook procesado para cancelación.");
    } else {
      // Para otros eventos (por ejemplo, activación), procesa de forma normal
      const subscriptionDoc = await dbAdmin.collection('subscriptions').doc(subscriptionID).get();
      if (!subscriptionDoc.exists) {
        console.log("No se encontró la suscripción:", subscriptionID);
        return res.status(400).send("Suscripción no encontrada");
      }
      const subscriptionInfo = subscriptionDoc.data();
      const newPlan = subscriptionInfo.plan;

      if (newPlan) {
        await dbAdmin.collection('usuarios').doc(idUsuario).update({ plan: newPlan });
        console.log(`Plan actualizado a ${newPlan} para el usuario ${idUsuario}`);
        await dbAdmin.collection('subscriptions').doc(subscriptionID).update({ status: subscriptionData.status });
        return res.status(200).send("Webhook procesado correctamente.");
      } else {
        console.log("No se encontró plan asociado en la suscripción.");
        return res.status(400).send("Plan no definido en la suscripción");
      }
    }
  } catch (error) {
    console.error("Error al procesar el webhook de PayPal:", error);
    res.status(500).send("Error interno");
  }
});

export default router;
