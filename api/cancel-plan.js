import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const VENDOR_ID = process.env.PADDLE_VENDOR_ID;
const API_KEY = process.env.PADDLE_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  const { subscription_id } = req.body;

  if (!subscription_id) {
    return res.status(400).json({ success: false, message: 'Faltan parámetros' });
  }

  try {
    const response = await axios.post('https://vendors.paddle.com/api/2.0/subscription/users_cancel', {
      vendor_id: VENDOR_ID,
      vendor_auth_code: API_KEY,
      subscription_id: subscription_id,
    });

    if (response.data.success) {
      res.status(200).json({ success: true, message: 'Suscripción cancelada con éxito' });
    } else {
      res.status(500).json({ success: false, message: 'Error al cancelar la suscripción' });
    }
  } catch (err) {
    console.error('Error al cancelar la suscripción:', err);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}