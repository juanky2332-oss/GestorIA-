import { GoogleGenerativeAI } from '@google/generative-ai';
import type { DocumentData } from '../types';

// 1. LEER LA API KEY DE FORMA SEGURA
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Inicializamos la IA
const genAI = new GoogleGenerativeAI(API_KEY || '');

// Función auxiliar para convertir archivo a base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Aseguramos que solo cogemos la parte de datos, sin el prefijo "data:image..."
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const analyzeDocument = async (file: File): Promise<DocumentData> => {
  // Verificación de seguridad inicial
  if (!API_KEY) {
    console.error("❌ NO API KEY: Revisa las variables de entorno en Vercel.");
    throw new Error("Falta la API Key de Gemini.");
  }

  try {
    console.log(`📄 Procesando archivo con IA: ${file.name}`);
    const base64Data = await fileToBase64(file);

    // ✅ Usamos el modelo estándar y rápido
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      Actúa como un experto contable. Analiza la imagen de este documento (factura, ticket, etc).
      Extrae EXCLUSIVAMENTE este JSON (sin nada más de texto):
      {
        "tipo": "Factura, Ticket o Albarán",
        "fecha": "DD/MM/YYYY",
        "proveedor": "Nombre de la empresa",
        "total": 0.00,
        "conceptos": ["Lista de items o servicios"]
      }
      Si no encuentras un dato, pon null o 0.
    `;

    // Llamada a la IA
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

    // ✅ LIMPIEZA ROBUSTA: Quitamos cualquier markdown que la IA ponga
    const cleanedText = text
      .replace(/``````json
      .replace(/``````
      .trim();

    // Parseo seguro
    let json;
    try {
      json = JSON.parse(cleanedText);
    } catch (e) {
      console.error("Error al leer el JSON de la IA:", cleanedText);
      throw new Error("La IA no devolvió un formato válido.");
    }

    // Mapeo final de datos
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
    // Mensaje de error amigable para el usuario
    throw new Error(error.message || "Error al procesar el documento con la IA.");
  }
};
