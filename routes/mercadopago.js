// routes/mercadopago.js
import { Router } from 'express';
import mercadopago from 'mercadopago';

const router = Router();

// Configuración del SDK de Mercado Pago con tu token
mercadopago.configurations.setAccessToken(process.env.MERCADO_PAGO_ACCESS_TOKEN);


// Endpoint para crear la suscripción (preapproval)
router.post('/create-preapproval', async (req, res) => {
  try {
    const { plan, userEmail } = req.body;

    // Define los datos de la suscripción según el plan seleccionado
    let transaction_amount;
    let reason;
    if (plan === 'basic') {
      transaction_amount = 2.99;
      reason = "Suscripción - Plan Básico";
    } else if (plan === 'pro') {
      transaction_amount = 4.99;
      reason = "Suscripción - Plan Pro";
    } else {
      return res.status(400).json({ error: "Plan inválido" });
    }

    // Configuración de la suscripción mensual
    const preapprovalData = {
      reason,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount,
        currency_id: "USD",
        // La fecha de inicio se puede establecer como la actual o con un desfase
        start_date: new Date().toISOString(),
      },
      back_url: {
        success: "https://stratiplay.com/success",
        failure: "https://stratiplay.com/failure",
        pending: "https://stratiplay.com/pending",
      },
      payer_email: userEmail,
    };

    const response = await mercadopago.preapproval.create(preapprovalData);

    // La respuesta incluye un "init_point" donde el usuario debe ser redirigido para confirmar la suscripción
    return res.json({ init_point: response.body.init_point, preapproval_id: response.body.id });
  } catch (error) {
    console.error("Error al crear la preaprobación:", error);
    return res.status(500).json({ error: "Error al crear la suscripción" });
  }
});

// Endpoint para cancelar una suscripción
router.post('/cancel-preapproval', async (req, res) => {
  try {
    const { preapproval_id } = req.body;
    const response = await mercadopago.preapproval.cancel(preapproval_id);
    return res.json({ status: response.body.status });
  } catch (error) {
    console.error("Error al cancelar la suscripción:", error);
    return res.status(500).json({ error: "Error al cancelar la suscripción" });
  }
});

export default router;
