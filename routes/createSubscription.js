// routes/createSubscription.js
import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

router.post('/create-subscription', async (req, res) => {
  try {
    // Se esperan en el cuerpo los datos necesarios:
    // userUid: el uid del usuario (external_reference)
    // payerEmail: email del pagador
    // amount (opcional): monto a cobrar (por defecto 20)
    // frequency y frequency_type (opcional)
    const { userUid, payerEmail, amount, frequency, frequency_type } = req.body;

    const payload = {
      auto_recurring: {
        frequency: frequency || 1,
        frequency_type: frequency_type || "months",
        transaction_amount: amount || 20,
        currency_id: "ARS",
        start_date: new Date().toISOString(), // o ajusta según convenga
        billing_day: 1,
        billing_start_proportional: false
      },
      payer_email: payerEmail,
      external_reference: userUid, // se pasa el uid del usuario
      back_url: process.env.MP_BACK_URL, // tu webhook con el parámetro secret
      reason: "Suscripción Stratiplay"
    };

    const mpResponse = await axios.post("https://api.mercadopago.com/preapproval", payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`
      }
    });

    // Envía la respuesta de MP al frontend (por ejemplo, la URL a redirigir)
    res.status(200).json(mpResponse.data);
  } catch (error) {
    console.error("Error al crear suscripción:", error.response ? error.response.data : error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
