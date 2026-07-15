// Vercel Serverless Function
// Arquivo: api/create-preference.js  ← pasta deve ser MINÚSCULA no GitHub
// IMPORTANTE: renomeie a pasta "API" para "api" no repositório

const MODE = 'sandbox'; // mude para 'production' quando quiser cobrar de verdade

const ACCESS_TOKEN = 'APP_USR-6685980794053357-071123-7c29c4cd51f6f5c723b27055078a51db-3535716818';
const IS_SANDBOX   = MODE === 'sandbox';

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET para testar se a API está no ar
  if (req.method === 'GET') {
    return res.status(405).json({ status: 'ok', message: 'Método não permitido — use POST', mode: MODE });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { amount, description, payerEmail, requestId } = req.body || {};

  if (!amount || !payerEmail) {
    return res.status(400).json({ error: 'Dados incompletos', recebido: { amount, payerEmail } });
  }

  const baseUrl = 'https://app.trazu.com.br';

  const preference = {
    items: [{
      id: requestId || 'trazu-frete',
      title: String(description || 'Frete Trazu').slice(0, 60),
      quantity: 1,
      unit_price: parseFloat(amount),
      currency_id: 'BRL',
      category_id: 'services'
    }],
    payer: { email: payerEmail },
    back_urls: {
      success: `${baseUrl}?payment=success`,
      failure: `${baseUrl}?payment=failure`,
      pending: `${baseUrl}?payment=pending`
    },
    auto_return: 'approved',
    statement_descriptor: 'TRAZU',
    external_reference: String(requestId || Date.now())
  };

  try {
    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': String(requestId || Date.now())
      },
      body: JSON.stringify(preference)
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('MP Error:', JSON.stringify(mpData));
      return res.status(502).json({
        error: 'Mercado Pago retornou erro',
        status: mpResponse.status,
        detail: mpData
      });
    }

    const paymentUrl = IS_SANDBOX ? mpData.sandbox_init_point : mpData.init_point;

    return res.status(200).json({
      init_point: paymentUrl,
      preference_id: mpData.id,
      mode: MODE
    });

  } catch (err) {
    console.error('Server error:', err.message);
    return res.status(500).json({ error: 'Erro interno', message: err.message });
  }
};
