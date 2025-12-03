import { GoogleGenerativeAI } from '@google/generative-ai';
import type { DocumentData } from '../types';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY || '');

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
  console.log(`📄 Procesando archivo: ${file.name}`);

  if (!API_KEY) {
    throw new Error("Falta la API Key de Gemini");
  }

  try {
    const base64Data = await fileToBase64(file);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

    const prompt = `
      Analiza este documento financiero.
      Extrae JSON estricto:
      - tipo, fecha, proveedor, total, conceptos (array)
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: file.type,
          data: base64Data,
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();
    
    // ✅ LIMPIEZA SEGURA (sin regex complejas)
    const cleanedText = text.split('``````').join('').trim();
      
    let json;
    try {
        json = JSON.parse(cleanedText);
    } catch (e) {
        console.error("Error JSON:", cleanedText);
        throw new Error("Respuesta no válida");
    }

    const data = {
      documentType: json.tipo || 'Desconocido',
      document_type: json.tipo || 'Desconocido',
      type: json.tipo || 'Desconocido',
      date: json.fecha || '',
      supplier: json.proveedor || 'No identificado',
      total: typeof json.total === 'number' ? json.total : parseFloat(json.total) || 0,
      items: json.conceptos || []
    };

    return data as any;

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
};
