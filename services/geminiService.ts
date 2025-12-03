import { GoogleGenerativeAI } from '@google/generative-ai';
import type { DocumentData } from '../types';

// 1. LEER LA API KEY
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Inicializar cliente
const genAI = new GoogleGenerativeAI(API_KEY || '');

// Función auxiliar para convertir archivo a base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Limpieza segura del base64
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const analyzeDocument = async (file: File): Promise<DocumentData> => {
  // Verificación de seguridad
  if (!API_KEY) {
    console.error("❌ Error: No se encontró la API Key en las variables de entorno.");
    throw new Error("Falta la API Key de Gemini.");
  }

  console.log(`📄 Procesando archivo: ${file.name}`);

  try {
    const base64Data = await fileToBase64(file);

    // Usamos el modelo estándar 'gemini-1.5-flash'
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      Analiza esta imagen de un documento financiero (factura o ticket).
      Responde ÚNICAMENTE con un JSON válido con esta estructura:
      {
        "tipo": "Factura" o "Ticket",
        "fecha": "DD/MM/YYYY",
        "proveedor": "Nombre empresa",
        "total": 0.00,
        "conceptos": ["item 1", "item 2"]
      }
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
    console.log('✅ Respuesta Gemini:', text);

    // --- LIMPIEZA SEGURA DE JSON (Método sin Regex complejas) ---
    let cleanedText = text;
    // 1. Si tiene ```
    if (cleanedText.includes('```json')) {
      cleanedText = cleanedText.split('```
    } else if (cleanedText.includes('```')) {
      cleanedText = cleanedText.split('```
    }
    // 2. Si quedó algún ``` al final, lo quitamos
    if (cleanedText.includes('```
      cleanedText = cleanedText.split('```')[0];
    }
    cleanedText = cleanedText.trim();
    // -----------------------------------------------------------

    let json;
    try {
      json = JSON.parse(cleanedText);
    } catch (e) {
      console.error("Error parseando JSON:", cleanedText);
      throw new Error("La IA no devolvió un JSON válido.");
    }

    return {
      documentType: json.tipo || 'Desconocido',
      document_type: json.tipo || 'Desconocido', // Compatibilidad
      type: json.tipo || 'Desconocido',          // Compatibilidad
      date: json.fecha || '',
      supplier: json.proveedor || 'No identificado',
      total: typeof json.total === 'number' ? json.total : parseFloat(json.total) || 0,
      items: json.conceptos || []
    } as any;

  } catch (error: any) {
    console.error('❌ Error en analyzeDocument:', error);
    throw error;
  }
};
