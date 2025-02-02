import client from '../utils/paypal';
import paypal from '@paypal/checkout-server-sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  const { plan_id } = req.body;

  if (!plan_id) {
    return res.status(400).json({ success: false, message: 'Falta el plan_id' });
  }

  try {
    const PaypalClient = client();
    const request = new paypal.subscriptions.SubscriptionsCreateRequest();
    request.requestBody({
      plan_id: plan_id,
    });

    const response = await PaypalClient.execute(request);

    if (response.statusCode !== 201) {
      return res.status(500).json({ success: false, message: 'Error al crear la suscripción' });
    }

    res.status(200).json({ success: true, data: response.result });
  } catch (err) {
    console.error('Error al crear la suscripción:', err);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}