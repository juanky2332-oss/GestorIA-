import type { DocumentData } from '../types';
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist/build/pdf';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// --- CONVERSORES DE IMAGEN ---
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

// Función para limpiar números
function parseNum(val: any): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const clean = val.toString().replace(/[^\d.,-]/g, '').replace(',', '.');
  return parseFloat(clean) || 0;
}

export const analyzeDocument = async (file: File): Promise<DocumentData> => {
  if (!API_KEY) throw new Error("Falta API Key OpenAI");

  try {
    console.log(`📄 Procesando: ${file.name}`);
    let base64Data = file.type === 'application/pdf' ? await convertPdfToImage(file) : await fileToBase64(file);
    
    // PROMPT: Pedimos explícitamente los nombres que suelen fallar
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
                text: `Analiza esta factura. Extrae datos JSON estrictos:
                  {
                    "tipo": "Factura",
                    "fecha": "DD/MM/YYYY",
                    "proveedor": "Nombre completo",
                    "concepto": "Resumen del servicio",
                    "base_imponible": 0.00 (Subtotal sin impuestos),
                    "porcentaje_iva": 0 (Solo el número, ej: 21),
                    "total": 0.00,
                    "items": []
                  }` 
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

    console.log("✅ JSON RAW:", json);

    // --- MAPEO MASIVO PARA ACERTAR EN EL FRONTEND ---
    // Devolvemos la variable con TODOS los nombres posibles que puede tener en 'types.ts'
    
    const baseValue = parseNum(json.base_imponible);
    const taxValue = parseNum(json.porcentaje_iva);
    const totalValue = parseNum(json.total);

    return {
      documentType: json.tipo || 'Factura',
      type: json.tipo || 'Factura',
      date: json.fecha || '',
      supplier: json.proveedor || 'Desconocido',
      concept: json.concepto || 'Varios',
      description: json.concepto || 'Varios',
      
      // AQUI ESTÁ LA CLAVE: Probamos todos los nombres
      base: baseValue,
      subtotal: baseValue,
      taxBase: baseValue,
      netAmount: baseValue,

      tax: taxValue,
      tax_percent: taxValue,
      vat: taxValue,
      taxPercentage: taxValue,

      total: totalValue,
      amount: totalValue,
      
      items: json.items || [],

      // EXTRAS: A veces los datos van anidados en 'metadata'
      metadata: {
         base: baseValue,
         subtotal: baseValue,
         tax: taxValue,
         taxPercentage: taxValue
      }
    } as any;

  } catch (error: any) {
    console.error('❌ Error:', error);
    throw error;
  }
};
