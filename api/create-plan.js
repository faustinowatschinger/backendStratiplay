const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Configuración
const PAYPAL_CLIENT_ID = 'ATOBUsqg1Dk6ilQFpWPzc-az44Lzjq7nyxqYy0zpgymTjpN_7cGaAcbCQmK0BUw_GClePmOPUH1iu6iw';
const PAYPAL_CLIENT_SECRET = 'EJmmHAttK_JgQxcpj8gi5x_t9ZAjAX7o88xbdg5CqFIPowO4ae0UcOPSEfOaAHPSOa5nKoWHR8yvOMk9';
const PAYPAL_API = 'https://api-m.sandbox.paypal.com';

// Obtener Token de Acceso
async function getAccessToken() {
  const response = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();
  if (!data.access_token) {
    throw new Error('Error al obtener el token de acceso');
  }
  return data.access_token;
}

// Crear un plan
export async function createPlan(product_id, name, description, price) {
  const accessToken = await getAccessToken();
  const response = await fetch(`${PAYPAL_API}/v1/billing/plans`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      product_id: product_id,
      name: name,
      description: description,
      status: 'ACTIVE',
      billing_cycles: [
        {
          frequency: {
            interval_unit: 'MONTH',
            interval_count: 1,
          },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: {
              value: price,
              currency_code: 'USD',
            },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee: {
          value: '0',
          currency_code: 'USD',
        },
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3,
      },
    }),
  });

  const data = await response.json();
  if (response.status !== 201) {
    throw new Error(`Error al crear el plan: ${JSON.stringify(data)}`);
  }
  return data.id; // Devuelve el ID del plan creado
}

// Manejo de la solicitud
export async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  const { product_id } = req.body;
  if (!product_id) {
    return res.status(400).json({ success: false, message: 'Falta el product_id' });
  }

  try {
    const basicPlanId = await createPlan(product_id, 'Plan Básico', 'Plan mensual básico', '2,99');
    const proPlanId = await createPlan(product_id, 'Plan Pro', 'Plan mensual pro', '4,99');

    res.status(200).json({
      success: true,
      data: {
        basicPlan: basicPlanId,
        proPlan: proPlanId,
      },
    });
  } catch (err) {
    console.error('Error al crear los planes:', err.message);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}