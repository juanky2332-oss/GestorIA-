import type { DocumentData } from '../types';

const WEBHOOK_URL = 'https://personal-n8n.t9gkry.easypanel.host/webhook/6e319f38-edd6-4b8b-b449-fbaf32193f09';

export const sendToN8N = async (data: DocumentData, file: File) => {
  try {
    console.log(`🚀 Enviando datos y archivo a n8n...`);

    // Creamos un formulario virtual para enviar el archivo real
    const formData = new FormData();
    
    // 1. Adjuntamos el archivo
    formData.append('file', file);
    
    // 2. Adjuntamos los datos como texto
    // (En n8n tendrás que leer esto parseando el JSON)
    formData.append('jsonData', JSON.stringify({
      ...data,
      timestamp: new Date().toISOString(),
      source: "GestorIA Web"
    }));

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      // NOTA: Al usar FormData, NO se pone 'Content-Type', el navegador lo pone solo
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Error n8n: ${response.statusText}`);
    }

    console.log("✅ ¡Enviado con éxito!");
    return true;

  } catch (error) {
    console.error("❌ Error al enviar a n8n:", error);
    throw error;
  }
};
