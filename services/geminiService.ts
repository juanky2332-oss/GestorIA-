import { GoogleGenerativeAI } from '@google/generative-ai';
import type { DocumentData } from '../types';

// 1. LEER LA API KEY (esto está bien)
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Inicializar cliente
const genAI = new GoogleGenerativeAI(API_KEY || '');

// Función auxiliar para convertir archivo a base64
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
    throw new Error("Falta la API Key de Gemini. Revisa la configuración en Vercel.");
  }

  try {
    // 2. PREPARAR DATOS
    const base64Data = await fileToBase64(file);
    
    // ✅ LA SOLUCIÓN DEFINITIVA: Usar el modelo 'gemini-pro-vision'
    // Este es el modelo estable para analizar imágenes y texto.
    const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });

    const prompt = `
      Analiza la imagen de este documento financiero (factura, ticket o albarán).
      Extrae la siguiente información en un formato JSON estricto y sin texto adicional:
      {
        "tipo": "Factura",
        "fecha": "DD/MM/YYYY",
        "proveedor": "Nombre de la Empresa",
        "total": 123.45,
        "conceptos": ["item 1", "item 2"]
      }
    `;

    // 3. LLAMADA A GEMINI
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

    // 4. LIMPIEZA Y PARSEO
    const cleanedText = text.replace(/``````/g, '').trim();
    
    let json;
    try {
        json = JSON.parse(cleanedText);
    } catch (e) {
        console.error("Error parseando JSON. La respuesta de la IA no era válida:", cleanedText);
        throw new Error("La IA devolvió un formato inesperado.");
    }

    // 5. MAPEO DE DATOS
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
    console.error('❌ Error en analyzeDocument:', error);
    throw error;
  }
};
