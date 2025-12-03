import { GoogleGenerativeAI } from '@google/generative-ai';
import type { DocumentData } from '../types';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Inicializamos cliente
const genAI = new GoogleGenerativeAI(API_KEY || '');

// Función auxiliar base64
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
  if (!API_KEY) {
    console.error("❌ NO API KEY FOUND");
    throw new Error("Falta la API Key de Gemini.");
  }

  console.log(`📄 Procesando archivo: ${file.name}`);
  
  try {
    const base64Data = await fileToBase64(file);

    // --- ESTRATEGIA MULTI-MODELO ---
    // Probamos modelos en orden. Si falla el flash, vamos al pro.
    const modelosAProbar = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
    
    let respuestaTexto = '';
    let modeloUsado = '';

    for (const nombreModelo of modelosAProbar) {
      try {
        console.log(`🔄 Intentando con modelo: ${nombreModelo}...`);
        const model = genAI.getGenerativeModel({ model: nombreModelo });
        
        const result = await model.generateContent([
          `Analiza este documento financiero. Devuelve SOLO un JSON válido:
           { "tipo": "Factura", "fecha": "DD/MM/YYYY", "proveedor": "x", "total": 0.00, "conceptos": [] }`,
          { inlineData: { mimeType: file.type, data: base64Data } }
        ]);
        
        const response = await result.response;
        respuestaTexto = response.text();
        modeloUsado = nombreModelo;
        console.log(`✅ ¡Éxito con ${nombreModelo}!`);
        break; // Si funciona, salimos del bucle
      } catch (e) {
        console.warn(`⚠️ Falló ${nombreModelo}, probando siguiente...`);
      }
    }

    if (!respuestaTexto) throw new Error("Todos los modelos fallaron o no devolvieron texto.");

    // Limpieza de JSON (sin regex peligrosas)
    let cleanedText = respuestaTexto;
    if (cleanedText.includes('``````json')[1];
    if (cleanedText.includes('``````')[0];
    cleanedText = cleanedText.trim();

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
    console.error('❌ Error Fatal:', error);
    throw new Error(`Error procesando documento: ${error.message}`);
  }
};
