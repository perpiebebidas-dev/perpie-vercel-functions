// Este archivo debe ir en: api/create-preference.js
const mercadopago = require("mercadopago");

exports.handler = async function (event, context) {
  // 1. Configurar Mercado Pago
  mercadopago.configure({
    access_token: process.env.MP_ACCESS_TOKEN, 
  });

  // 2. Solo aceptamos método POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    // 3. Recibimos los datos
    const data = JSON.parse(event.body);
    
    // Validamos datos básicos
    if (!data.total || !data.ventaId) {
        return { statusCode: 400, body: JSON.stringify({ error: "Faltan datos (total o ventaId)" }) };
    }

    // 4. Creamos la preferencia
    let preference = {
      items: [
        {
          title: "Compra en PER & PIE Bebidas",
          unit_price: Number(data.total),
          quantity: 1, 
          currency_id: "ARS"
        },
      ],
      // CRUCIAL: Aquí va el ID de la fila en Supabase para saber qué venta actualizar luego
      external_reference: data.ventaId.toString(), 
      
      back_urls: data.back_urls, 
      auto_return: "approved",   

      // --- ¡CAMBIO REALIZADO! (Notificación a Vercel) ---
      // Le decimos a MP: "Cuando cobres, avísale a este archivo"
      // *** DEBES SUSTITUIR [TU-DOMINIO-VERCEL].vercel.app ***
      notification_url: "https://[TU-DOMINIO-VERCEL].vercel.app/api/webhook",
    };

    // 5. Crear preferencia en MP
    const response = await mercadopago.preferences.create(preference);

    return {
      statusCode: 200,
      body: JSON.stringify({
        init_point: response.body.init_point,
        sandbox_init_point: response.body.sandbox_init_point,
      }),
    };
  } catch (error) {
    console.error("Error al crear preferencia:", error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message || "Error al crear preferencia de Mercado Pago." }) };
  }
};

