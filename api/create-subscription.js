import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const VENDOR_ID = process.env.PADDLE_VENDOR_ID;
const API_KEY = process.env.PADDLE_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  const { product_id, customer_email } = req.body;

  if (!product_id || !customer_email) {
    return res.status(400).json({ success: false, message: 'Faltan parámetros' });
  }

  try {
    const response = await axios.post('https://vendors.paddle.com/api/2.0/product/generate_pay_link', {
      vendor_id: VENDOR_ID,
      vendor_auth_code: API_KEY,
      product_id: product_id,
      customer_email: customer_email,
    });

    if (response.data.success) {
      res.status(200).json({ success: true, data: response.data.response.url });
    } else {
      res.status(500).json({ success: false, message: 'Error al generar el enlace de pago' });
    }
  } catch (err) {
    console.error('Error al generar el enlace de pago:', err);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}