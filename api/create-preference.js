// El archivo debe ir en: api/create-preference.js
const mercadopago = require("mercadopago");

exports.handler = async function (event, context) {
  mercadopago.configure({ access_token: process.env.MP_ACCESS_TOKEN });

  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  try {
    const data = JSON.parse(event.body);
    
    if (!data.total || !data.ventaId) {
        return { statusCode: 400, body: JSON.stringify({ error: "Faltan datos (total o ventaId)" }) };
    }

    let preference = {
      items: [
        {
          title: "Compra en PER & PIE Bebidas",
          unit_price: Number(data.total),
          quantity: 1, 
          currency_id: "ARS"
        },
      ],
      external_reference: data.ventaId.toString(), 
      back_urls: data.back_urls, 
      auto_return: "approved",   

      // --- CORRECCIÓN FINAL ---
      notification_url: "https://perpie.vercel.app/api/webhook", 
    };

    const response = await mercadopago.preferences.create(preference);

    return {
      statusCode: 200,
      body: JSON.stringify({
        init_point: response.body.init_point,
        sandbox_init_point: response.body.sandbox_init_point,
      }),
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};