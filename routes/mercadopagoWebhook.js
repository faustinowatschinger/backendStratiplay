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

// routes/mercadopagoWebhook.js
router.post('/webhook', async (req, res) => {
  const event = req.body;
  console.log("Webhook recibido:", JSON.stringify(event, null, 2));

  try {
    const resource = event.resource || event.data; // Asegura compatibilidad
    if (!resource) {
      return res.status(400).send("Datos incompletos.");
    }

    const preapproval_id = resource.preapproval_id || resource.id;
    const idUsuario = resource.external_reference; // Mercado Pago lo envía aquí

    console.log(`Datos: preapproval_id=${preapproval_id}, usuario=${idUsuario}`);

    let newPlan = null;
    if (preapproval_id === '2c93808494f9e7ec0194fa433f740024') {
      newPlan = 'basic';
    } else if (preapproval_id === '2c93808494f9e7ec0194fa68b1590038') {
      newPlan = 'pro';
    }

    if (newPlan && idUsuario) {
      await dbAdmin.collection('usuarios').doc(idUsuario).update({ plan: newPlan });
      console.log(`Plan actualizado a ${newPlan} para ${idUsuario}`);
      res.status(200).send("OK");
    } else {
      console.log("Faltan datos para actualizar.");
      res.status(400).send("Faltan datos");
    }
  } catch (error) {
    console.error("Error en webhook:", error);
    res.status(500).send("Error interno");
  }
});

export default router;
