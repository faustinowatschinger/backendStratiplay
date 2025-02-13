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

// Manejo de POST (recomendado, ya que Mercado Pago envía external_reference en el cuerpo)
router.post('/webhook', async (req, res) => {
  const secret = req.query.secret;
  if (secret !== process.env.WEBHOOK_SECRET) {
    return res.status(403).send('No autorizado');
  }

  const event = req.body;
  console.log("POST Webhook recibido:", JSON.stringify(event, null, 2));

  try {
    // Se intenta obtener la data en diferentes niveles, ya que puede venir en event.data o event.resource
    const data = event.data || event.resource;
    if (!data) {
      return res.status(400).send("No se encontró data en el evento.");
    }

    const preapproval_id = data.preapproval_id || data.id;
    // Extraemos el external_reference del cuerpo, ya que aquí Mercado Pago lo debería incluir
    const idUsuario = data.external_reference || data.idUsuario;
    
    let newPlan = null;
    if (preapproval_id === '2c93808494f9e7ec0194fa433f740024') {
      newPlan = 'basic';
    } else if (preapproval_id === '2c93808494f9e7ec0194fa68b1590038') {
      newPlan = 'pro';
    }

    if (newPlan && idUsuario) {
      await dbAdmin.collection('usuarios').doc(idUsuario).update({ plan: newPlan });
      console.log(`Plan actualizado a ${newPlan} para el usuario ${idUsuario}`);
      res.status(200).send("Webhook procesado correctamente.");
    } else {
      console.log("POST Webhook: Faltan datos para actualizar. newPlan:", newPlan, "idUsuario:", idUsuario);
      res.status(400).send("Faltan datos");
    }
  } catch (error) {
    console.error("Error al procesar el webhook:", error);
    res.status(500).send("Error interno");
  }
});

export default router;
