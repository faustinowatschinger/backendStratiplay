// routes/mercadopagoWebhook.js
import express from 'express';
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

import serviceAccount from '../config/ordo-62889-firebase-adminsdk-zl2wb-dd93e17d22.json' assert { type: 'json' };

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const dbAdmin = admin.firestore();
const router = express.Router();

// RUTA POST: Notificación de servidor a servidor (recomendado)
router.post('/webhook', async (req, res) => {
  const secret = req.query.secret;
  if (secret !== process.env.WEBHOOK_SECRET) {
    return res.status(403).send("No autorizado");
  }

  const event = req.body;
  console.log("POST Webhook recibido:", JSON.stringify(event, null, 2));

  try {
    const data = event.data || event.resource;
    if (!data) {
      return res.status(400).send("No se encontró data en el evento.");
    }
    const preapproval_id = data.preapproval_id || data.id;
    // Se extrae external_reference (que debe haber sido enviado al crear la suscripción)
    const idUsuario = data.external_reference || data.idUsuario;
    
    let newPlan = null;
    if (preapproval_id === "2c93808494f9e7ec0194fa433f740024") {
      newPlan = "basic";
    } else if (preapproval_id === "2c93808494f9e7ec0194fa68b1590038") {
      newPlan = "pro";
    }

    if (newPlan && idUsuario) {
      await dbAdmin.collection("usuarios").doc(idUsuario).update({ plan: newPlan });
      console.log(`Plan actualizado a ${newPlan} para el usuario ${idUsuario}`);
      res.status(200).send("Webhook procesado correctamente.");
    } else {
      console.log("POST Webhook: Faltan datos. newPlan:", newPlan, "idUsuario:", idUsuario);
      res.status(400).send("Faltan datos");
    }
  } catch (error) {
    console.error("Error al procesar el webhook:", error);
    res.status(500).send("Error interno");
  }
});

// (Opcional) RUTA GET: Redirección del usuario tras el pago
router.get('/webhook', async (req, res) => {
  const secret = req.query.secret;
  if (secret !== process.env.WEBHOOK_SECRET) {
    return res.status(403).send("No autorizado");
  }

  const preapproval_id = req.query.preapproval_id;
  // En GET es probable que external_reference no esté presente, por lo que depende de cómo lo configures.
  const idUsuario = req.query.external_reference || req.query.idUsuario;
  console.log(`GET Webhook: preapproval_id=${preapproval_id}, idUsuario=${idUsuario}`);

  let newPlan = null;
  if (preapproval_id === "2c93808494f9e7ec0194fa433f740024") {
    newPlan = "basic";
  } else if (preapproval_id === "2c93808494f9e7ec0194fa68b1590038") {
    newPlan = "pro";
  }

  if (newPlan && idUsuario) {
    try {
      await dbAdmin.collection("usuarios").doc(idUsuario).update({ plan: newPlan });
      console.log(`Plan actualizado a ${newPlan} para el usuario ${idUsuario}`);
      res.redirect("/confirmacion-de-suscripcion"); // O muestra una página de confirmación
    } catch (error) {
      console.error("Error actualizando el plan:", error);
      res.status(500).send("Error interno");
    }
  } else {
    console.log("GET Webhook: Faltan datos para actualizar.");
    res.status(400).send("Faltan datos");
  }
});

export default router;
