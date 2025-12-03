import type { DocumentData } from '../types';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const analyzeDocument = async (file: File): Promise<DocumentData> => {
  if (!API_KEY) throw new Error("Falta API Key");

  try {
    const base64Data = await fileToBase64(file);

    // 1. URL MANUAL DE LA API (Usamos v1beta con gemini-1.5-flash, que es lo estándar)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

    // 2. CUERPO DE LA PETICIÓN MANUAL
    const requestBody = {
      contents: [{
        parts: [
          { text: `Analiza este documento financiero (factura/ticket). Devuelve JSON estricto: { "tipo": "Factura", "fecha": "DD/MM/YYYY", "proveedor": "Empresa", "total": 100.00, "conceptos": ["item1"] }` },
          {
            inline_data: {
              mime_type: file.type,
              data: base64Data
            }
          }
        ]
      }]
    };

    // 3. HACER FETCH DIRECTO
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error API Google (${response.status}): ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    // 4. EXTRAER RESPUESTA
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("La IA no devolvió texto.");

    const cleanedText = text.replace(/``````/g, '').trim();
    const json = JSON.parse(cleanedText);

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
    console.error('❌ Error Manual:', error);
    throw new Error(error.message);
  }
};
