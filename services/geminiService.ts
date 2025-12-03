import { GoogleGenerativeAI } from '@google/generative-ai';
import type { DocumentData } from '../types';

// AQUÍ ES DONDE EL CÓDIGO BUSCA LA LLAVE QUE PUSISTE EN VERCEL
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(API_KEY || '');

// Función auxiliar para convertir imagen a texto (base64)
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const analyzeDocument = async (file: File): Promise<DocumentData> => {
  // Si no hay llave, avisa del error
  if (!API_KEY) {
    console.error("❌ ERROR CRÍTICO: No encuentro la API Key. Revisa el PASO 2 en Vercel.");
    throw new Error("Falta la API Key");
  }

  try {
    // 1. Preparar imagen
    const base64 = await fileToBase64(file);
    
    // 2. Preparar modelo (usamos flash que es rápido)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // 3. Pedir datos
    const result = await model.generateContent([
      `Analiza este documento financiero. Devuelve un JSON exacto con estos campos:
       { "tipo": "Factura/Ticket", "fecha": "DD/MM/AAAA", "proveedor": "Nombre", "total": 0.00, "conceptos": ["item1", "item2"] }`,
      {
        inlineData: { mimeType: file.type, data: base64 }
      }
    ]);

    // 4. Limpiar resultado
    const text = result.response.text().replace(/``````/g, '').trim();
    const json = JSON.parse(text);

    return {
      documentType: json.tipo || 'Desconocido',
      date: json.fecha || '',
      supplier: json.proveedor || '',
      total: json.total || 0,
      items: json.conceptos || []
    };

  } catch (error) {
    console.error("❌ Error leyendo el archivo:", error);
    throw error;
  }
};
