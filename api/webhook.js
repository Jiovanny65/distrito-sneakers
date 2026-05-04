// ============================================
//   /api/webhook
//   Recibe notificaciones de pago de Mercado Pago.
//   Configurar en MP Panel -> Webhooks: https://distrito-sneakers.vercel.app/api/webhook
//   Eventos: payment
// ============================================

export default async function handler(req, res) {
  if (req.method === 'GET') return res.status(200).send('OK');
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
    const body = req.body || {};
    const topic = body.type || req.query.type || req.query.topic;
    const id = body?.data?.id || req.query.id;

    if (topic === 'payment' && id && ACCESS_TOKEN) {
      const r = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
        headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` }
      });
      const payment = await r.json();
      // Aqui podrias guardar el pago en Supabase si quieres histórico:
      //   const { error } = await fetch('https://avxqwalugyjauwayxjvn.supabase.co/rest/v1/orders', {...})
      console.log('MP payment notification:', {
        id: payment.id,
        status: payment.status,
        external_reference: payment.external_reference,
        amount: payment.transaction_amount,
        metadata: payment.metadata
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(200).json({ ok: true }); // MP requiere 200 siempre
  }
}
