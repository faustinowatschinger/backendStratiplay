// routes/mercadopagoWebhook.js
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

// Manejo de POST (Mercado Pago envía external_reference en el cuerpo)
router.post('/webhook', async (req, res) => {
  const secret = req.query.secret;
  if (secret !== process.env.WEBHOOK_SECRET) {
    return res.status(403).send('No autorizado');
  }

  const event = req.body;
  console.log("POST Webhook recibido:", JSON.stringify(event, null, 2));

  try {
    // Se intenta obtener la data en event.data o event.resource
    const data = event.data || event.resource;
    if (!data) {
      return res.status(400).send("No se encontró data en el evento.");
    }

    const preapproval_id = data.preapproval_id || data.id;
    const idUsuario = data.external_reference || data.idUsuario;
    
    if (!preapproval_id || !idUsuario) {
      console.log("POST Webhook: Faltan datos. preapproval_id:", preapproval_id, "idUsuario:", idUsuario);
      return res.status(400).send("Faltan datos");
    }

    // Buscar la suscripción en Firestore usando el preapproval_id
    const subDoc = await dbAdmin.collection('subscriptions').doc(preapproval_id).get();
    if (!subDoc.exists) {
      console.log("No se encontró la suscripción para preapproval_id:", preapproval_id);
      return res.status(400).send("Suscripción no encontrada");
    }
    const subscriptionData = subDoc.data();
    const newPlan = subscriptionData.plan;

    if (newPlan) {
      // Actualizar el plan del usuario en la colección 'usuarios'
      await dbAdmin.collection('usuarios').doc(idUsuario).update({ plan: newPlan });
      console.log(`Plan actualizado a ${newPlan} para el usuario ${idUsuario}`);

      // Opcional: actualizar el estado de la suscripción en la colección "subscriptions"
      await dbAdmin.collection('subscriptions').doc(preapproval_id).update({ status: data.status });
      
      res.status(200).send("Webhook procesado correctamente.");
    } else {
      console.log("POST Webhook: No se encontró plan asociado en la suscripción. preapproval_id:", preapproval_id);
      res.status(400).send("Plan no definido en la suscripción");
    }
  } catch (error) {
    console.error("Error al procesar el webhook:", error);
    res.status(500).send("Error interno");
  }
});

export default router;
