import type { DocumentData } from '../types';
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist/build/pdf';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// --- FUNCIONES DE CONVERSIÓN (Iguales) ---
const convertPdfToImage = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  if (!context) throw new Error("Fallo canvas");
  await page.render({ canvasContext: context, viewport: viewport }).promise;
  return canvas.toDataURL('image/jpeg', 0.85).split(',')[1]; 
};

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
    console.log(`📄 Procesando: ${file.name}`);
    const base64Data = file.type === 'application/pdf' ? await convertPdfToImage(file) : await fileToBase64(file);
    
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
                text: `Analiza este documento. Extrae JSON EXACTO con estos campos (todos string):
                  {
                    "document_type": "FACTURA" o "TICKET",
                    "date": "DD/MM/YYYY",
                    "supplier": "Nombre Proveedor",
                    "concept": "Concepto principal",
                    "tax_base": "Base imponible (ej: 100.00)",
                    "taxes": "Impuestos totales (ej: 21.00)",
                    "total": "Total final (ej: 121.00)"
                  }
                  - Si no encuentras un valor, pon cadena vacía "".
                  - Devuelve solo números limpios en los importes (ej: "150.50", no "150,50 €").` 
              },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Data}` } }
            ]
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0
      })
    });

    if (!response.ok) throw new Error("Error OpenAI");
    const data = await response.json();
    const json = JSON.parse(data.choices[0].message.content);

    console.log("✅ DATOS:", json);

    // --- MAPEO EXACTO A TU INTERFACE 'DocumentData' ---
    return {
      document_type: (json.document_type as any) || 'FACTURA',
      date: json.date || '',
      supplier: json.supplier || '',
      concept: json.concept || '',
      
      // Aquí está la magia: Asignamos a los nombres correctos y convertimos a String
      tax_base: json.tax_base ? String(json.tax_base) : '0.00',
      taxes: json.taxes ? String(json.taxes) : '0.00',
      total: json.total ? String(json.total) : '0.00'
    };

  } catch (error: any) {
    console.error('❌ Error:', error);
    throw error;
  }
};
