// ============================================
//   /api/webhook
//   Recibe notificaciones de pago de Mercado Pago.
//   Configurar en MP Panel -> Webhooks: https://distrito-sneakers.vercel.app/api/webhook
//   Eventos: payment, merchant_order
//
//   Vars de entorno requeridas en Vercel:
//     MP_ACCESS_TOKEN     (secreto)
//     MP_WEBHOOK_SECRET   (Clave secreta del Webhook MP - opcional pero recomendado)
// ============================================

import crypto from 'node:crypto';

function verifyMpSignature(req, secret) {
  if (!secret) return true; // Sin secret configurado, no validamos
  const sigHeader = req.headers['x-signature'] || '';
  if (!sigHeader) return true; // Sin firma (test del panel u otros) - aceptamos
  try {
    const reqId = req.headers['x-request-id'] || '';
    const dataId = (req.body?.data?.id || req.query?.['data.id'] || req.query?.id || '').toString();

    // Parse: "ts=1234567,v1=abcdef..."
    const parts = Object.fromEntries(
      sigHeader.split(',').map(p => p.trim().split('=').map(s => s.trim()))
    );
    const ts = parts.ts;
    const v1 = parts.v1;
    if (!ts || !v1) return true; // Cabecera incompleta - mejor aceptar que rechazar tests

    // Manifest segun docs MP: id:<data_id>;request-id:<x-request-id>;ts:<ts>;
    const manifest = `id:${dataId};request-id:${reqId};ts:${ts};`;
    const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(expected));
  } catch (err) {
    console.error('Signature verify error:', err);
    return false;
  }
}

export default async function handler(req, res) {
  // MP suele enviar HEAD/GET para verificar conectividad antes de POST
  if (req.method === 'HEAD')    return res.status(200).end();
  if (req.method === 'GET')     return res.status(200).send('OK');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(200).end(); // No bloquear nada

  try {
    const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
    const WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET;

    // Validacion de firma HMAC
    if (WEBHOOK_SECRET && !verifyMpSignature(req, WEBHOOK_SECRET)) {
      console.warn('Webhook con firma invalida - posible request falso');
      return res.status(401).json({ error: 'invalid signature' });
    }

    const body = req.body || {};
    const topic = body.type || req.query.type || req.query.topic;
    const id = body?.data?.id || req.query.id || req.query['data.id'];

    if (topic === 'payment' && id && ACCESS_TOKEN) {
      const r = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
        headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` }
      });
      const payment = await r.json();
      console.log('MP payment notification:', {
        id: payment.id,
        status: payment.status,           // approved | pending | rejected
        status_detail: payment.status_detail,
        external_reference: payment.external_reference,
        amount: payment.transaction_amount,
        payer: payment.payer?.email
      });

      // Actualizar el pedido en Supabase via RPC mark_order_paid
      const SUPABASE_URL = process.env.SUPABASE_URL || 'https://avxqwalugyjauwayxjvn.supabase.co';
      const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || 'sb_publishable_jOwE3q-Tk7r_NZKmoaUBNA_CKHwQ9xT';

      if (payment.external_reference) {
        try {
          const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/mark_order_paid`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_ANON,
              'Authorization': `Bearer ${SUPABASE_ANON}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              p_external_ref: payment.external_reference,
              p_payment_id:   String(payment.id),
              p_status:       payment.status
            })
          });
          const rpcData = await rpcRes.json();
          console.log('Supabase order updated:', rpcData);
        } catch (err) {
          console.error('Failed to update order in Supabase:', err);
        }
      }

      // Aqui podrias guardar el pedido en Supabase si quisieras histórico:
      // await fetch('https://avxqwalugyjauwayxjvn.supabase.co/rest/v1/orders', {
      //   method: 'POST',
      //   headers: {
      //     apikey: process.env.SUPABASE_SERVICE_KEY,
      //     Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({
      //     mp_payment_id: payment.id,
      //     status: payment.status,
      //     amount: payment.transaction_amount,
      //     external_reference: payment.external_reference,
      //     metadata: payment.metadata
      //   })
      // });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(200).json({ ok: true }); // MP requiere 200 siempre para no reintentar
  }
}
