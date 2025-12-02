// Este archivo debe ir en: api/webhook.js
const mercadopago = require("mercadopago");
const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase (las variables de entorno se cargan desde Vercel)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY; 

// Inicializa el cliente de Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey); 

exports.handler = async function (event, context) {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

    try {
        const payload = JSON.parse(event.body);
        
        // 1. Verificar que la notificación es de un pago
        if (payload.topic !== 'payment' || payload.type !== 'payment') {
            // Esto es necesario para notificaciones que no son pagos (ej: órdenes de pago)
            return { statusCode: 200, body: 'Notificación recibida, no es un pago a procesar.' };
        }

        // 2. Obtener el ID de la transacción de Mercado Pago
        const paymentId = payload.data.id;
        
        // 3. Consultar a la API de MP para obtener los detalles del pago
        mercadopago.configure({ access_token: process.env.MP_ACCESS_TOKEN });
        const response = await mercadopago.payment.get(paymentId);
        const pago = response.body;

        // 4. Extraer la referencia ÚNICA de la venta (el external_reference)
        const externalReference = pago.external_reference; 

        // 5. Verificar el estado y la referencia
        if (pago.status === 'approved' && externalReference) {
            // Si el pago está aprobado, actualizamos Supabase
            const { error: updateError } = await supabase
                .from('ventas')
                .update({ 
                    formaDePago: 'QR Dinámico (Pagado)', 
                    archivada: false, // O la lógica que uses para marcar como pagada
                    fecha: new Date().toISOString() // Actualiza la fecha de pago real
                })
                .eq('external_reference', externalReference); // Usamos la referencia para encontrar la venta

            if (updateError) {
                console.error('Error actualizando Supabase:', updateError);
                return { statusCode: 500, body: JSON.stringify({ error: 'Error al actualizar DB.' }) };
            }
        }
        
        // MP espera una respuesta 200 OK para confirmar que recibimos el aviso
        return { statusCode: 200, body: 'Notificación procesada con éxito.' };
    } catch (error) {
        console.error('Error fatal en Webhook:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Error interno del servidor.' }) };
    }
};
