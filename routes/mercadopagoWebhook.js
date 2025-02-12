// routes/mercadopagoWebhook.js
import express from 'express';
import admin from 'firebase-admin';
import serviceAccount from '../serviceAccountKey.json'; // Ajusta la ruta si es necesario

// Inicializamos firebase-admin si no está inicializado
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const dbAdmin = admin.firestore();
const router = express.Router();

/*
  Este endpoint recibe las notificaciones (webhook) de Mercado Pago.
  Se asume que al configurar el plan se envía el id del usuario en el campo "idUsuario".
  
  Se comparan dos preapproval_id:
    - '2c93808494f9e7ec0194fa433f740024' => plan básico ('basic')
    - '2c93808494f9e7ec0194fa68b1590038' => plan pro ('pro')
*/

router.post('/webhook', async (req, res) => {
  const event = req.body;
  console.log("Webhook recibido:", JSON.stringify(event, null, 2));

  try {
    // Se asume que la información relevante está en event.data.
    const data = event.data;
    if (!data) {
      return res.status(400).send("No se encontró data en el evento.");
    }

    // Extraemos el preapproval_id
    const preapproval_id = data.preapproval_id || data.id;

    // Ahora, en lugar de usar external_reference, usamos el campo idUsuario que configuraste.
    const idUsuario = data.idUsuario;
    
    let newPlan = null;
    if (preapproval_id === '2c93808494f9e7ec0194fa433f740024') {
      newPlan = 'basic';
    } else if (preapproval_id === '2c93808494f9e7ec0194fa68b1590038') {
      newPlan = 'pro';
    }

    if (newPlan && idUsuario) {
      // Actualiza el documento del usuario en Firestore usando idUsuario
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
