// Vercel Serverless Function
// Arquivo: api/create-preference.js
// Esta função roda no servidor — o Access Token NUNCA aparece no frontend

// ─── MODO: 'sandbox' para testes | 'production' para pagamentos reais ───────
// Mude para 'production' apenas quando quiser cobrar de verdade
const MODE = 'sandbox';

const ACCESS_TOKEN = 'APP_USR-6685980794053357-071123-7c29c4cd51f6f5c723b27055078a51db-3535716818';
const PUBLIC_KEY   = 'APP_USR-53e7afd9-3a27-424c-84c6-af2c5d0189f6';
const IS_SANDBOX   = MODE === 'sandbox';

export default async function handler(req, res) {
  // CORS para o domínio Trazu
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { amount, description, payerEmail, requestId } = req.body;

  if (!amount || !description || !payerEmail) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }

  const baseUrl = 'https://trazu-mvp.vercel.app';

  const preference = {
    items: [
      {
        id: requestId || 'trazu-frete',
        title: `Trazu — ${description}`,
        quantity: 1,
        unit_price: parseFloat(amount),
        currency_id: 'BRL',
        category_id: 'services'
      }
    ],
    payer: {
      email: payerEmail
    },
    payment_methods: {
      excluded_payment_types: [],
      installments: 1   // sem parcelamento no piloto
    },
    back_urls: {
      success: `${baseUrl}?payment=success`,
      failure: `${baseUrl}?payment=failure`,
      pending: `${baseUrl}?payment=pending`
    },
    auto_return: 'approved',
    statement_descriptor: 'TRAZU',
    external_reference: requestId || Date.now().toString()
  };

  try {
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': requestId || Date.now().toString()
      },
      body: JSON.stringify(preference)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('MP Error:', JSON.stringify(data));
      return res.status(500).json({ error: 'Erro ao criar preferência', detail: data });
    }

    // sandbox_init_point = checkout de teste (sem cobrar dinheiro real)
    // init_point         = checkout de produção (cobra dinheiro real)
    const paymentUrl = IS_SANDBOX ? data.sandbox_init_point : data.init_point;

    return res.status(200).json({
      init_point:    paymentUrl,
      preference_id: data.id,
      mode:          MODE
    });

  } catch (err) {
    console.error('Server error:', err.message);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}


export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { amount, description, payerEmail, requestId } = req.body;

  if (!amount || !description || !payerEmail) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }

  const baseUrl = 'https://trazu-mvp.vercel.app';

  const preference = {
    items: [
      {
        id: requestId || 'trazu-frete',
        title: description,
        quantity: 1,
        unit_price: parseFloat(amount),
        currency_id: 'BRL',
        category_id: 'services'
      }
    ],
    payer: {
      email: payerEmail
    },
    back_urls: {
      success: `${baseUrl}?payment=success`,
      failure: `${baseUrl}?payment=failure`,
      pending: `${baseUrl}?payment=pending`
    },
    auto_return: 'approved',
    statement_descriptor: 'TRAZU',
    external_reference: requestId || '',
    // Cartões de teste aceitos no sandbox:
    // Aprovado:  5031 7557 3453 0604 (Master) · CVV 123 · Nome: APRO
    // Recusado:  4000 0000 0000 0002 (Visa)   · CVV 123 · Nome: OTHE
  };

  try {
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': requestId || Date.now().toString()
      },
      body: JSON.stringify(preference)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('MP Error:', data);
      return res.status(500).json({ error: 'Erro ao criar preferência', detail: data });
    }

    // Em sandbox usa o link de teste, em produção usa o link real
    const paymentUrl = IS_SANDBOX ? data.sandbox_init_point : data.init_point;

    return res.status(200).json({
      init_point:    paymentUrl,
      preference_id: data.id,
      mode:          MODE
    });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

