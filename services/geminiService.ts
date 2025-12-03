import type { DocumentData } from '../types';

// 1. LEEMOS LA CLAVE DE OPENAI
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// Función para convertir imagen a Base64 (se mantiene igual)
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Limpiamos la cabecera "data:image/..." si existe
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Esta función se sigue llamando igual para no romper el resto de la app
export const analyzeDocument = async (file: File): Promise<DocumentData> => {
  
  // Validación de seguridad
  if (!API_KEY) {
    console.error("❌ FALTA LA CLAVE: No se encontró VITE_OPENAI_API_KEY");
    throw new Error("Falta la API Key de OpenAI. Revisa Vercel.");
  }

  try {
    console.log(`🤖 Enviando ${file.name} a OpenAI GPT-4o...`);
    const base64Data = await fileToBase64(file);

    // 2. LLAMADA DIRECTA A LA API DE OPENAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o", // Modelo más inteligente y rápido actual
        messages: [
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: "Eres un experto contable. Analiza esta imagen. Extrae los datos en formato JSON estricto: { \"tipo\": \"Factura\" o \"Ticket\", \"fecha\": \"DD/MM/YYYY\", \"proveedor\": \"Nombre\", \"total\": 0.00, \"conceptos\": [\"item1\", \"item2\"] }. Si no encuentras algo pon null." 
              },
              {
                type: "image_url",
                image_url: {
                  // OpenAI necesita el prefijo data:image...
                  url: `data:${file.type};base64,${base64Data}`
                }
              }
            ]
          }
        ],
        response_format: { type: "json_object" }, // Obliga a responder en JSON
        temperature: 0 // Máxima precisión
      })
    });

    // 3. GESTIÓN DE ERRORES
    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ Error OpenAI:", errorData);
      
      if (response.status === 401) throw new Error("API Key inválida o incorrecta.");
      if (response.status === 429) throw new Error("Te has quedado sin saldo en OpenAI.");
      
      throw new Error(`Error OpenAI (${response.status}): ${errorData.error?.message}`);
    }

    // 4. PROCESAR RESPUESTA
    const data = await response.json();
    const content = data.choices[0].message.content;
    console.log("✅ Respuesta recibida:", content);

    const json = JSON.parse(content);

    // 5. DEVOLVER DATOS AL FRONTEND
    return {
      documentType: json.tipo || 'Desconocido',
      document_type: json.tipo || 'Desconocido',
      type: json.tipo || 'Desconocido',
      date: json.fecha || '',
      supplier: json.proveedor || 'No identificado',
      total: typeof json.total === 'number' ? json.total : parseFloat(json.total) || 0,
      items: json.conceptos || []
    } as any;

  } catch (error: any) {
    console.error('❌ Error en el proceso:', error);
    throw error;
  }
};
