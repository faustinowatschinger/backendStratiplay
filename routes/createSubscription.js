// routes/createSubscription.js
import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

router.post('/create-subscription', async (req, res) => {
  try {
    // Se espera que en el body se incluya "planType" (ej. "basic" o "pro")
    const { userUid, payerEmail, planType } = req.body;

    // Mapeo de planType a preapproval_plan_id (ya creados en Mercado Pago)
    const planMapping = {
      basic: "2c93808494f9e7ec0194fa433f740024", // plan basico
      pro: "2c93808494f9e7ec0194fa68b1590038"    // plan pro
    };
    
    const planId = planMapping[planType];
    if (!planId) {
      return res.status(400).json({ error: "PlanType no válido" });
    }

    const payload = {
      preapproval_plan_id: planId,      // Asocia la suscripción al plan existente
      payer_email: payerEmail,
      external_reference: userUid,      // Se envía el uid del usuario
      back_url: process.env.MP_BACK_URL, // Configurado en tu .env
      reason: "Suscripción Stratiplay"
    };

    const mpResponse = await axios.post("https://api.mercadopago.com/preapproval", payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`
      }
    });

    console.log("Respuesta de Mercado Pago:", mpResponse.data);
    // Extraemos el preapproval_id de la respuesta (campo "id")
    const preapprovalId = mpResponse.data.id;

    // Guardamos en Firestore la relación entre la suscripción y el plan
    // Usamos la colección "subscriptions" y el preapprovalId como ID del documento.
    const admin = require('firebase-admin');
    const dbAdmin = admin.firestore();
    await dbAdmin.collection('subscriptions').doc(preapprovalId).set({
      userUid,
      plan: planType,
      status: mpResponse.data.status || 'pending',
      createdAt: new Date().toISOString()
    });

    res.status(200).json(mpResponse.data);
  } catch (error) {
    console.error("Error al crear suscripción:", error.response ? error.response.data : error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
