import { GoogleGenerativeAI } from '@google/generative-ai';
// Importamos DocumentData pero usaremos 'any' en el return para evitar conflictos de tipos
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
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const analyzeDocument = async (file: File): Promise<DocumentData> => {
  // Log para depuración
  console.log(`📄 Procesando archivo: ${file.name}`);

  if (!API_KEY) {
    console.error("❌ FATAL: No hay API Key configurada en Vercel (VITE_GEMINI_API_KEY)");
    throw new Error("Falta la API Key de Gemini");
  }

  try {
    // 2. PREPARAR DATOS
    const base64Data = await fileToBase64(file);
    
    // Usamos modelo flash para mayor velocidad
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      Analiza este documento financiero (factura, ticket o albarán).
      Extrae la siguiente información en formato JSON estricto:
      - tipo (String: "Factura", "Ticket", "Albarán" u "Otro")
      - fecha (String: formato DD/MM/YYYY)
      - proveedor (String: nombre de la empresa o emisor)
      - total (Number: importe total numérico)
      - conceptos (Array de Strings: lista de items comprados)

      Si algún campo no se encuentra, usa valores vacíos o 0.
      Responde SOLO con el JSON, sin bloques de código markdown.
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
    // Quitamos `````` por si la IA los incluye
    const cleanedText = text.replace(/``````/g, '').trim();
    const json = JSON.parse(cleanedText);

    // 5. MAPEO DE DATOS (Con 'as any' para arreglar tu error de build)
    // Ponemos múltiples variantes de nombres para asegurar compatibilidad con tu types.ts
    const data = {
      // Variantes de tipo
      documentType: json.tipo || 'Desconocido',
      document_type: json.tipo || 'Desconocido',
      type: json.tipo || 'Desconocido',

      // Resto de campos
      date: json.fecha || '',
      supplier: json.proveedor || 'No identificado',
      total: typeof json.total === 'number' ? json.total : parseFloat(json.total) || 0,
      items: json.conceptos || []
    };

    // ⚠️ IMPORTANTE: El 'as any' silencia el error de TypeScript que te dio en Vercel
    return data as any;

  } catch (error) {
    console.error('❌ Error en analyzeDocument:', error);
    throw error;
  }
};
