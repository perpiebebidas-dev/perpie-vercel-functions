// El archivo debe ir en: api/generate-qr.js
const mercadopago = require("mercadopago");

exports.handler = async function (event, context) {
    mercadopago.configure({ access_token: process.env.MP_ACCESS_TOKEN });

    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    try {
        const { ventaId, totalMonto } = JSON.parse(event.body);

        if (!ventaId || !totalMonto) {
            return { statusCode: 400, body: JSON.stringify({ error: "Faltan datos de venta (ID o Monto)." }) };
        }
        
        // --- CORRECCIÓN DEFINITIVA ---
        // Usamos el dominio real que aparece en tu captura de Vercel
        const notificationUrl = "https://perpie.vercel.app/api/webhook"; 

        // 1. Crear el objeto de la orden de pago
        const order = {
            title: `Pedido PER & PIE #${ventaId}`,
            description: `Cobro por la venta de bebidas #${ventaId}`,
            external_reference: ventaId, 
            notification_url: notificationUrl, 

            items: [{
                title: "Total del Pedido",
                quantity: 1,
                unit_price: parseFloat(totalMonto),
                unit_measure: "unit",
                total_amount: parseFloat(totalMonto)
            }],
        };

        // 2. Crear la orden de pago en MP
        const orderResponse = await mercadopago.merchant_orders.create(order);
        const orderId = orderResponse.body.id;
        
        // 3. Crear el QR
        // IMPORTANTE: Simulación de QR. En producción real requiere una Caja registrada.
        const initPoint = orderResponse.body.preference_id ? orderResponse.body.preference_id : orderResponse.body.init_point;
        
        if (initPoint) {
            return {
                statusCode: 200,
                body: JSON.stringify({ 
                    qr_link: `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${initPoint}`, 
                    venta_id: ventaId 
                })
            };
        }

    } catch (error) {
        console.error("Error al generar QR:", error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message || "Error al generar el QR." }) };
    }
};