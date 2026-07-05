// ============================================
//   /api/create-preference
//   Crea una preference en Mercado Pago y devuelve init_point
//   Vars de entorno requeridas en Vercel:
//     MP_ACCESS_TOKEN  (secreto - NUNCA exponer al cliente)
// ============================================

export default async function handler(req, res) {
  // CORS basico (si llega del mismo dominio no es necesario, pero por si acaso)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
  if (!ACCESS_TOKEN) {
    return res.status(500).json({ error: 'MP_ACCESS_TOKEN no configurado en Vercel' });
  }

  try {
    const body = req.body || {};
    const {
      externalReference,
      productId,
      productName,
      productType,
      modelo,
      talla,
      color,
      calidad,
      cantidad,
      precio,        // precio unitario en CLP
      nombre,
      telefono,
      email,
      entrega,
      direccion,
      region,
      comuna,
      calle,
      depto,
      codigo_postal,
      pais,
      comentarios
    } = body;

    // Validaciones basicas
    if (!productName || !precio || !cantidad || !nombre || !telefono) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const qty = Math.max(1, parseInt(cantidad, 10) || 1);
    const unitPrice = Math.round(Number(precio));

    // Construir titulo descriptivo
    const titleParts = [productName];
    if (talla)   titleParts.push(`T${talla}`);
    if (color)   titleParts.push(color);
    if (calidad) titleParts.push(`(${calidad})`);
    const itemTitle = titleParts.join(' · ').slice(0, 250);

    const description = [
      productType ? `Tipo: ${productType}` : null,
      modelo ? `Modelo: ${modelo}` : null,
      calidad ? `Calidad: ${calidad}` : null,
      entrega ? `Entrega: ${entrega}` : null,
      direccion ? `Direccion: ${direccion}` : null,
      region ? `Region: ${region}` : null,
      comentarios ? `Comentarios: ${comentarios}` : null
    ].filter(Boolean).join(' | ').slice(0, 600);

    // Limpieza del telefono: dejar solo digitos, asegurar formato +56XXXXXXXXX
    const phoneDigits = String(telefono || '').replace(/\D/g, '');
    const phoneClp = phoneDigits.startsWith('56') ? phoneDigits : ('56' + phoneDigits);

    // Resolver origin para back_urls
    const proto = (req.headers['x-forwarded-proto'] || 'https').toString().split(',')[0];
    const host  = (req.headers['x-forwarded-host'] || req.headers.host || '').toString().split(',')[0];
    const origin = host ? `${proto}://${host}` : '';

    const preference = {
      items: [
        {
          id: String(productId || 'sneaker'),
          title: itemTitle,
          description: description || itemTitle,
          quantity: qty,
          currency_id: 'CLP',
          unit_price: unitPrice
        }
      ],
      payer: {
        name: nombre,
        email: email || undefined,
        phone: { area_code: '56', number: phoneDigits.replace(/^56/, '') },
        address: (calle || comuna) ? {
          street_name: calle || '',
          street_number: '',
          zip_code: codigo_postal || ''
        } : undefined
      },
      shipments: (calle || comuna) ? {
        receiver_address: {
          street_name: calle || '',
          street_number: '',
          zip_code: codigo_postal || '',
          city_name: comuna || '',
          state_name: region || '',
          country_name: 'Chile',
          floor: depto || ''
        }
      } : undefined,
      metadata: {
        product_id: productId || null,
        product_name: productName,
        type: productType || null,
        size: talla || null,
        color: color || null,
        quality: calidad || null,
        delivery: entrega || null,
        address: direccion || null,
        region: region || null,
        comuna: comuna || null,
        street: calle || null,
        apartment: depto || null,
        zip: codigo_postal || null,
        country: pais || 'Chile',
        comments: comentarios || null,
        customer_phone: '+' + phoneClp
      },
      back_urls: origin ? {
        success: `${origin}/gracias.html?status=success`,
        pending: `${origin}/gracias.html?status=pending`,
        failure: `${origin}/gracias.html?status=failure`
      } : undefined,
      auto_return: origin ? 'approved' : undefined,
      statement_descriptor: 'SpeedStyleCL',
      external_reference: externalReference || `SS-${Date.now()}-${productId || 'x'}`
    };

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preference)
    });

    const data = await mpRes.json();

    if (!mpRes.ok) {
      console.error('MP error:', data);
      return res.status(mpRes.status).json({
        error: 'Error creando preferencia en Mercado Pago',
        details: data?.message || data
      });
    }

    return res.status(200).json({
      id: data.id,
      init_point: data.init_point,
      sandbox_init_point: data.sandbox_init_point
    });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Error interno', details: err.message });
  }
}
