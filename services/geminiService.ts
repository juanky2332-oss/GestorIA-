import type { DocumentData } from '../types';
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist/build/pdf';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// --- FUNCIONES DE CONVERSIÓN ---
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
                text: `Analiza este documento. Extrae JSON EXACTO:
                  {
                    "document_type": "FACTURA",
                    "date": "DD/MM/YYYY",
                    "supplier": "Nombre Proveedor",
                    "concept": "Concepto principal",
                    "tax_base": 0.00 (Número, Base Imponible),
                    "taxes": 0.00 (Número, Impuestos Totales),
                    "total": 0.00 (Número, Total Final)
                  }
                  Si no encuentras algo, pon 0 o "".` 
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

    console.log("✅ DATOS RAW:", json);

    // --- MAPEO "ESCOPETA" (Cubrimos todas las posibilidades) ---
    const taxBaseStr = json.tax_base ? String(json.tax_base) : '0.00';
    const taxesStr = json.taxes ? String(json.taxes) : '0.00';
    const totalStr = json.total ? String(json.total) : '0.00';

    return {
      // Campos estándar obligatorios
      document_type: json.document_type || 'FACTURA',
      date: json.date || '',
      supplier: json.supplier || '',
      concept: json.concept || '',
      
      // 1. NOMBRES OFICIALES (Según types.ts)
      tax_base: taxBaseStr,
      taxes: taxesStr,
      total: totalStr,

      // 2. NOMBRES ALTERNATIVOS (Por si el frontend usa otros)
      base: taxBaseStr,
      subtotal: taxBaseStr,
      
      tax: taxesStr,
      vat: taxesStr,
      
      amount: totalStr,

      // 3. TIPOS NUMÉRICOS (Por si el frontend espera number en vez de string)
      // A veces React explota si espera un número y recibe texto
      baseNumeric: parseFloat(taxBaseStr),
      taxNumeric: parseFloat(taxesStr),
      totalNumeric: parseFloat(totalStr)

    } as any; // 'as any' permite devolver campos extra sin que TypeScript se queje

  } catch (error: any) {
    console.error('❌ Error:', error);
    throw error;
  }
};
