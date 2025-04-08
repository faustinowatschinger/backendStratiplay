import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
dotenv.config();

const router = express.Router();

router.post('/create-subscription', async (req, res) => {
  try {
    // Se espera que en el body se incluya: userUid, payerEmail, planType (ej. "basic" o "pro")
    // y opcionalmente cardTokenId si el plan requiere pago con tarjeta.
    const { userUid, payerEmail, planType, cardTokenId } = req.body;

    // Mapeo de planType a preapproval_plan_id (ya creados en Mercado Pago)
    const planMapping = {
      basic: "2c93808494f9e7ec0194fa433f740024", // plan básico
      pro: "2c93808494f9e7ec0194fa68b1590038"    // plan pro
    };

    const planId = planMapping[planType];
    if (!planId) {
      return res.status(400).json({ error: "PlanType no válido" });
    }

    // Si el plan requiere pago con tarjeta y se usa ese método, se debe enviar card_token_id.
    // En este ejemplo, si cardTokenId está presente, se agrega al payload.
    const payload = {
      preapproval_plan_id: planId,      // Asocia la suscripción al plan existente
      payer_email: payerEmail,
      external_reference: userUid,      // Se envía el uid del usuario
      back_url: process.env.MP_BACK_URL, // Configurado en tu .env
      reason: "Suscripción Stratiplay",
      // Si se recibe cardTokenId, lo agregamos:
      ...(cardTokenId && { card_token_id: cardTokenId }),
      // Agregamos start_date asegurando que sea una fecha futura (por ejemplo, 5 minutos en el futuro)
      start_date: new Date(Date.now() + 5 * 60 * 1000).toISOString()
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
