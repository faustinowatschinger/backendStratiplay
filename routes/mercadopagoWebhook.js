// routes/mercadopagoWebhook.js
import express from 'express';
import admin from 'firebase-admin';
import serviceAccount from '../config/ordo-62889-firebase-adminsdk-zl2wb-dd93e17d22.json' assert { type: 'json' };

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const dbAdmin = admin.firestore();
const router = express.Router();

router.post('/webhook', async (req, res) => {
  const event = req.body;
  console.log("Webhook recibido:", JSON.stringify(event, null, 2));

  try {
    const data = event.data;
    if (!data) {
      return res.status(400).send("No se encontró data en el evento.");
    }

    // Log para inspeccionar qué datos se reciben
    console.log("Datos recibidos:", JSON.stringify(data, null, 2));

    const preapproval_id = data.preapproval_id || data.id;

    // Se intenta obtener el id del usuario de dos posibles campos
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
    } else {
      console.log("No se realizó actualización. newPlan o idUsuario faltante.");
    }

    res.status(200).send("Webhook procesado correctamente.");
  } catch (error) {
    console.error("Error al procesar el webhook:", error);
    res.status(500).send("Error al procesar el webhook.");
  }
});

export default router;
