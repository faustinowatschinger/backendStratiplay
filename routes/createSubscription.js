// routes/createSubscription.js
import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

router.post('/create-subscription', async (req, res) => {
  try {
    // Ahora se espera que en el body se incluya "planType" (ej. "basic" o "pro")
    const { userUid, payerEmail, amount, planType, frequency, frequency_type } = req.body;
    const startDate = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const payload = {
      auto_recurring: {
        frequency: frequency || 1,
        frequency_type: frequency_type || "months",
        transaction_amount: amount || 20,
        currency_id: "ARS",
        start_date: startDate,
        billing_day: 1,
        billing_start_proportional: false
      },
      payer_email: payerEmail,
      external_reference: userUid, // Se envía el uid del usuario
      back_url: process.env.MP_BACK_URL, // Configurado en .env
      reason: "Suscripción Stratiplay"
    };

    const mpResponse = await axios.post("https://api.mercadopago.com/preapproval", payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`
      }
    });

    console.log("Respuesta de Mercado Pago:", mpResponse.data);
    // Extraemos el preapproval_id de la respuesta (usamos el campo "id")
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
