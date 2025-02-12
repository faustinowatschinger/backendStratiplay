// routes/mercadoPagoWebhook.js
import express from 'express';
import admin from 'firebase-admin';
import serviceAccount from '../serviceAccountKey.json'; // Ajusta la ruta si es necesario

// Si no se ha inicializado ya, inicializamos la app de admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const dbAdmin = admin.firestore();
const router = express.Router();

/*
  Este endpoint recibe las notificaciones (webhook) de Mercado Pago.
  Se espera que Mercado Pago envíe en el payload datos que incluyan el preapproval_id
  y, preferiblemente, un external_reference que contenga el uid del usuario.
  
  En este ejemplo se comparan dos preapproval_id:
    - '2c93808494f9e7ec0194fa433f740024' => plan básico ('basic')
    - '2c93808494f9e7ec0194fa68b1590038' => plan pro ('pro')
  
  Ajusta la lógica según el formato real del payload y la forma en que envías el external_reference.
*/

router.post('/webhook', async (req, res) => {
  const event = req.body;
  console.log("Webhook recibido:", JSON.stringify(event, null, 2));

  try {
    // Ejemplo: se verifica que se trate de un evento de preapproval
    // Revisa la documentación de Mercado Pago para saber cuál es el campo que identifica el evento.
    // Aquí asumimos que la información relevante está en event.data.
    const data = event.data;
    if (!data) {
      return res.status(400).send("No se encontró data en el evento.");
    }

    // Extraemos el preapproval_id y asumimos que se envía un external_reference (por ejemplo, el uid del usuario)
    const preapproval_id = data.preapproval_id || data.id;
    const externalReference = data.external_reference; // Asegúrate de enviar esto desde Mercado Pago

    let newPlan = null;
    if (preapproval_id === '2c93808494f9e7ec0194fa433f740024') {
      newPlan = 'basic';
    } else if (preapproval_id === '2c93808494f9e7ec0194fa68b1590038') {
      newPlan = 'pro';
    }

    if (newPlan && externalReference) {
      // Actualiza el documento del usuario en Firestore
      await dbAdmin.collection('usuarios').doc(externalReference).update({ plan: newPlan });
      console.log(`Plan actualizado a ${newPlan} para el usuario ${externalReference}`);
    } else {
      console.log("No se realizó actualización. newPlan o externalReference faltante.");
    }

    res.status(200).send("Webhook procesado correctamente.");
  } catch (error) {
    console.error("Error al procesar el webhook:", error);
    res.status(500).send("Error al procesar el webhook.");
  }
});

export default router;
