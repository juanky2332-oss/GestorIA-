import type { DocumentData } from '../types';

// Tu Webhook de n8n
const WEBHOOK_URL = 'https://personal-n8n.t9gkry.easypanel.host/webhook/6e319f38-edd6-4b8b-b449-fbaf32193f09';

export const sendToN8N = async (data: DocumentData) => {
  try {
    console.log("🚀 Enviando datos a n8n...", data);

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...data,
        timestamp: new Date().toISOString(), // Añadimos fecha de envío
        source: "GestorIA Web"
      }),
    });

    if (!response.ok) {
      throw new Error(`Error n8n: ${response.statusText}`);
    }

    console.log("✅ ¡Enviado con éxito a n8n!");
    return true;

  } catch (error) {
    console.error("❌ Error al enviar a n8n:", error);
    // Opcional: Lanzar error si quieres que la UI avise al usuario
    throw error;
  }
};
