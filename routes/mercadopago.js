import { Router } from 'express';
import pkg from 'mercadopago';
const mp = pkg.default || pkg; // usa la exportación por defecto

const router = Router();

// Configuración del SDK de Mercado Pago con tu token
mp.configure({
  access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN,
});

// Endpoint para crear la preferencia de pago
router.post('/create-preference', async (req, res) => {
  console.log("Mercado Pago Access Token:", process.env.MERCADO_PAGO_ACCESS_TOKEN);
  try {
    const { plan, userEmail } = req.body;

    // Define los datos de la preferencia según el plan seleccionado
    let transaction_amount;
    let description;
    if (plan === 'basic') {
      transaction_amount = 2.99;
      description = "Suscripción - Plan Básico";
    } else if (plan === 'pro') {
      transaction_amount = 4.99;
      description = "Suscripción - Plan Pro";
    } else {
      return res.status(400).json({ error: "Plan inválido" });
    }

    // Configuración de la preferencia de pago
    const preference = {
      items: [
        {
          title: description,
          unit_price: transaction_amount,
          quantity: 1,
        },
      ],
      payer: {
        email: userEmail,
      },
      back_urls: {
        success: "https://stratiplay.com/success",
        failure: "https://stratiplay.com/failure",
        pending: "https://stratiplay.com/pending",
      },
      auto_return: "approved",
    };

    const response = await mp.preferences.create(preference);

    // La respuesta incluye un "preference_id" que se debe devolver al frontend
    return res.json({ preference_id: response.body.id });
  } catch (error) {
    console.error("Error al crear la preferencia de pago:", error);
    return res.status(500).json({ error: "Error al crear la preferencia de pago" });
  }
});

// Endpoint para cancelar una suscripción
router.post('/cancel-preapproval', async (req, res) => {
  try {
    const { preapproval_id } = req.body;
    const response = await mp.preapproval.cancel(preapproval_id);
    return res.json({ status: response.body.status });
  } catch (error) {
    console.error("Error al cancelar la suscripción:", error);
    return res.status(500).json({ error: "Error al cancelar la suscripción" });
  }
});

export default router;