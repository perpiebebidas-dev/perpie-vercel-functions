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
        
        // --- ¡CAMBIO CRÍTICO A VERCEL! ---
        // Se fuerza la URL del Webhook a Vercel para notificaciones.
        // URL DEFINITIVA: https://funciones-vercel-perpie.vercel.app/api/webhook
        const notificationUrl = "https://funciones-vercel-perpie.vercel.app/api/webhook"; // <-- ¡URL FINAL CORREGIDA!

        // 1. Crear el objeto de la orden de pago
        const order = {
            title: `Pedido PER & PIE #${ventaId}`,
            description: `Cobro por la venta de bebidas #${ventaId}`,
            external_reference: ventaId, // EL ENLACE ÚNICO A TU VENTA DE SUPABASE
            notification_url: notificationUrl, // Dónde debe avisar MP cuando paguen

            items: [{
                title: "Total del Pedido",
                quantity: 1,
                unit_price: parseFloat(totalMonto),
                unit_measure: "unit",
                total_amount: parseFloat(totalMonto)
            }],
        };

        // 2. Crear la orden de pago en MP (Endpoint /merchant_orders)
        const orderResponse = await mercadopago.merchant_orders.create(order);
        const orderId = orderResponse.body.id;
        
        // 3. Crear el QR basado en esa orden (Endpoint /instore/qr)
        // **IMPORTANTE:** Necesitas tener una 'caja' registrada en tu panel de MP (aunque sea virtual).
        const qrPayload = {
            qr_data: `{"qr":"${orderId}"}`, // Simulación. La API real pide el ID de la caja
            image_url: `https://api.mercadopago.com/instore/qr/orders/${orderId}/qr.png` // URL de ejemplo, la URL real viene del response.
        };

        // NOTA TÉCNICA: La API de QR requiere el ID de un "Caja/Point of Sale".
        // Para simplificar, si esto falla, usaremos la URL de checkout clásica, que también genera un QR de transferencia.

        // Usamos el Init Point de la orden (genera un link que se puede convertir a QR)
        const initPoint = orderResponse.body.preference_id ? orderResponse.body.preference_id : orderResponse.body.init_point;
        
        if (initPoint) {
            return {
                statusCode: 200,
                body: JSON.stringify({ 
                    qr_link: `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${initPoint}`, // Link que genera un QR al abrir
                    venta_id: ventaId 
                })
            };
        }

    } catch (error) {
        console.error("Error al generar QR:", error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message || "Error al generar el QR." }) };
    }
};