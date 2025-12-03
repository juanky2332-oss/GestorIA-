import type { DocumentData } from '../types';
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist/build/pdf';

// Configuración del Worker de PDF (Esencial para que funcione en el navegador)
// Usamos un CDN público para no complicar la configuración de Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// --- FUNCIÓN 1: Convertir PDF a Imagen JPG (Base64) ---
const convertPdfToImage = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  // Cogemos solo la primera página (la portada de la factura)
  const page = await pdf.getPage(1);
  
  // Renderizamos a una escala x2 para buena calidad (que OpenAI lea bien el texto)
  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  if (!context) throw new Error("No se pudo crear el contexto gráfico para leer el PDF.");

  await page.render({ canvasContext: context, viewport: viewport }).promise;
  
  // Convertimos el dibujo del canvas a imagen JPG base64
  const base64 = canvas.toDataURL('image/jpeg', 0.85);
  return base64.split(',')[1]; 
};

// --- FUNCIÓN 2: Convertir Archivo Normal a Base64 ---
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
    console.error("❌ FALTA CLAVE OPENAI");
    throw new Error("Falta la API Key de OpenAI en Vercel.");
  }

  try {
    console.log(`📄 Procesando archivo: ${file.name} (${file.type})`);

    let base64Data = '';
    let mimeType = 'image/jpeg'; // Por defecto asumiremos JPG (incluso para PDFs convertidos)

    // LÓGICA DE CONVERSIÓN
    if (file.type === 'application/pdf') {
      console.log("🔄 Detectado PDF: Convirtiendo a imagen...");
      base64Data = await convertPdfToImage(file);
      // mimeType ya es 'image/jpeg' por defecto
    } else {
      // Es una imagen normal
      base64Data = await fileToBase64(file);
      // Aseguramos que el mimeType sea válido
      mimeType = (file.type && file.type.startsWith('image/')) ? file.type : 'image/jpeg';
    }

    console.log(`🤖 Enviando imagen (${mimeType}) a OpenAI...`);

    // LLAMADA A OPENAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: "Analiza este documento financiero. Extrae JSON estricto: { \"tipo\": \"Factura\", \"fecha\": \"DD/MM/YYYY\", \"proveedor\": \"Nombre\", \"total\": 0.00, \"conceptos\": [\"item1\"] }. Si algún campo no está claro, pon null." 
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Data}`
                }
              }
            ]
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ Error API:", errorData);
      throw new Error(errorData.error?.message || "Error desconocido de OpenAI");
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    console.log("✅ Respuesta IA:", content);

    const json = JSON.parse(content);

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
    // Mensaje amigable si falla el PDF
    if (error.message.includes('pdf')) {
        throw new Error("Error al leer el PDF. Prueba a subir una imagen JPG/PNG.");
    }
    throw error;
  }
};
