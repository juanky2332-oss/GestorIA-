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
    
    // Usamos 'gemini-1.5-flash' que es el estándar rápido
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent([
      `Analiza este documento. Devuelve SOLO JSON válido: 
      { "tipo": "Factura", "fecha": "DD/MM/YYYY", "proveedor": "x", "total": 0, "conceptos": [] }`,
      { inlineData: { mimeType: file.type, data: base64Data } }
    ]);

    const response = await result.response;
    let text = response.text();

    // --- LIMPIEZA SEGURA (SIN EXPRESIONES REGULARES RARAS) ---
    // 1. Quitamos la palabra 'json' si sale
    text = text.replace(/json/gi, '');
    
    // 2. Quitamos las tres tildes (```
    text = text.split('```').join('');
    
    // 3. Limpiamos espacios
    text = text.trim();
    // ---------------------------------------------------------

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
    throw new Error("Error al analizar: " + error.message);
  }
};
