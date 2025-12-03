import type { DocumentData } from '../types';
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist/build/pdf';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// --- CONVERSORES DE IMAGEN (Se mantienen igual) ---
const convertPdfToImage = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  if (!context) throw new Error("Contexto canvas falló");
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
  if (!API_KEY) throw new Error("Falta API Key OpenAI");

  try {
    console.log(`📄 Procesando: ${file.name}`);
    let base64Data = file.type === 'application/pdf' ? await convertPdfToImage(file) : await fileToBase64(file);
    let mimeType = 'image/jpeg';

    // --- LLAMADA A OPENAI ---
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
                text: `
                  Eres un auditor contable. Analiza esta factura/ticket.
                  Extrae los datos exactos. Si hay desglose de IVA, úsalo.
                  
                  Devuelve JSON:
                  {
                    "tipo": "Factura",
                    "fecha": "DD/MM/YYYY",
                    "proveedor": "Nombre de la empresa (Busca arriba a la izquierda o en el logo)",
                    "concepto": "Resumen breve del servicio (Ej: Mecanizado de ejes)",
                    "base": 0.00 (Busca donde diga SUBTOTAL o BASE IMPONIBLE),
                    "impuestos_porcentaje": 0 (Busca donde diga IVA X%),
                    "impuestos_total": 0.00 (El importe del dinero del IVA),
                    "total": 0.00 (El importe final TOTAL),
                    "items": ["Lista de conceptos"]
                  }
                  
                  Pistas para esta factura:
                  - Proveedor suele ser "METAL MECANICA..." o similar.
                  - Base es el "SUBTOTAL".
                  - Impuestos % es el número del "IVA" (ej: 21).
                ` 
              },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}` } }
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

    console.log("✅ JSON OpenAI:", json);

    // --- MAPEO "ESCOPETA" (Devolvemos todo repetido para acertar el nombre) ---
    return {
      documentType: json.tipo || 'Factura',
      type: json.tipo || 'Factura',
      
      date: json.fecha || '',
      
      supplier: json.proveedor || 'Desconocido',
      
      // Concepto: Probamos varios nombres comunes
      concept: json.concepto || 'Varios',
      description: json.concepto || 'Varios',
      
      // Base Imponible: Probamos 'base', 'subtotal', 'taxBase'
      base: parseNum(json.base),
      subtotal: parseNum(json.base),
      taxBase: parseNum(json.base),
      
      // Impuestos %: Probamos 'tax_percent', 'tax', 'vat'
      tax_percent: parseNum(json.impuestos_porcentaje),
      tax: parseNum(json.impuestos_porcentaje), // A veces 'tax' se usa para el %
      vat: parseNum(json.impuestos_porcentaje),
      
      // Impuestos Total (€): Por si tu web espera el dinero y no el %
      taxAmount: parseNum(json.impuestos_total),
      
      // Total final
      total: parseNum(json.total),
      amount: parseNum(json.total), // A veces se llama amount
      
      items: json.items || []
    } as any;

  } catch (error: any) {
    console.error('❌ Error:', error);
    throw error;
  }
};

// Función auxiliar para limpiar números (quita símbolos € y converte a float)
function parseNum(val: any): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  // Limpia "3.300,00 €" a 3300.00
  const clean = val.toString().replace(/[^\d.,-]/g, '').replace(',', '.');
  return parseFloat(clean) || 0;
}
