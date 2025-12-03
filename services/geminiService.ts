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

// Función que intenta generar contenido con varios modelos
async function generateWithFallback(base64Data: string, mimeType: string) {
  // Lista de modelos a probar en orden
  const modelsToTry = [
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro-vision', // El antiguo, por si acaso
    'gemini-1.0-pro'
  ];

  const prompt = `Analiza este documento financiero. Devuelve JSON estricto: { "tipo": "Factura", "fecha": "DD/MM/YYYY", "proveedor": "Empresa", "total": 100.00, "conceptos": ["item1"] }`;
  
  let lastError;

  for (const modelName of modelsToTry) {
    try {
      console.log(`🔄 Probando modelo: ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      
      const result = await model.generateContent([
        prompt,
        { inlineData: { mimeType: mimeType, data: base64Data } }
      ]);
      
      console.log(`✅ ¡Éxito con el modelo ${modelName}!`);
      return result; // Si funciona, devuelve el resultado y sale
      
    } catch (error: any) {
      console.warn(`⚠️ Falló el modelo ${modelName}:`, error.message);
      lastError = error;
      // Continúa con el siguiente modelo...
    }
  }
  
  // Si llegamos aquí, fallaron todos
  throw lastError;
}

export const analyzeDocument = async (file: File): Promise<DocumentData> => {
  console.log(`📄 Procesando archivo: ${file.name}`);
  if (!API_KEY) throw new Error("Falta API Key");

  try {
    const base64Data = await fileToBase64(file);
    
    // Llamamos a nuestra función "todo terreno"
    const result = await generateWithFallback(base64Data, file.type);

    const response = await result.response;
    const text = response.text();
    
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
    console.error('❌ Error FINAL:', error);
    throw new Error(`Error de IA: ${error.message}`);
  }
};
