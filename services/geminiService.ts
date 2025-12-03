import { GoogleGenerativeAI } from '@google/generative-ai';
import type { DocumentData } from '../types';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY || '');

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const analyzeDocument = async (file: File): Promise<DocumentData> => {
  if (!API_KEY) throw new Error("Falta API Key");

  try {
    const base64Data = await fileToBase64(file);
    
    // ✅ CAMBIO CLAVE: Usamos el alias genérico 'gemini-flash-latest'
    // Esto asegura que siempre use la última versión activa (ahora mismo la 2.5)
    // y no falle si Google retira la anterior.
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const result = await model.generateContent([
      `Analiza este documento financiero. Devuelve SOLO JSON válido: 
      { "tipo": "Factura", "fecha": "DD/MM/YYYY", "proveedor": "x", "total": 0, "conceptos": [] }`,
      { inlineData: { mimeType: file.type, data: base64Data } }
    ]);

    const response = await result.response;
    let text = response.text();

    // Limpieza simple y efectiva
    text = text.replace(/json/gi, '').replace(/```

    const json = JSON.parse(text);

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
    console.error('Error IA:', error);
    // Si falla, intentamos con el modelo específico 2.5 como respaldo manual
    if (error.message.includes('404')) {
       throw new Error("El modelo de IA antiguo ha caducado. Intenta actualizar la librería o usar 'gemini-2.5-flash'.");
    }
    throw error;
  }
};
