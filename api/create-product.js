const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const PAYPAL_CLIENT_ID = 'ATOBUsqg1Dk6ilQFpWPzc-az44Lzjq7nyxqYy0zpgymTjpN_7cGaAcbCQmK0BUw_GClePmOPUH1iu6iw';
const PAYPAL_CLIENT_SECRET = 'EJmmHAttK_JgQxcpj8gi5x_t9ZAjAX7o88xbdg5CqFIPowO4ae0UcOPSEfOaAHPSOa5nKoWHR8yvOMk9';
const PAYPAL_API = 'https://api-m.sandbox.paypal.com';

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

async function createProduct() {
  const accessToken = await getAccessToken();
  const response = await fetch(`${PAYPAL_API}/v1/catalogs/products`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Subscripcion Stratiplay',
      description: 'Descripción del Producto',
      type: 'SERVICE',
      category: 'SOFTWARE',
      image_url: 'https://example.com/product-image.jpg',
      home_url: 'https://example.com',
    }),
  });

  const data = await response.json();
  if (response.status !== 201) {
    throw new Error(`Error al crear el producto: ${JSON.stringify(data)}`);
  }
  return data.id; // Devuelve el ID del producto creado
}

// Llama a la función para crear un producto y obtener el product_id
createProduct().then(productId => {
  console.log('Product ID:', productId);
}).catch(error => {
  console.error('Error al crear el producto:', error);
});