import type { DocumentData } from '../types';
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist/build/pdf';

// Configuración del Worker de PDF
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// --- 1. Convertir PDF a Imagen JPG ---
const convertPdfToImage = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1); // Solo primera página
  
  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  if (!context) throw new Error("Error creating canvas context");

  await page.render({ canvasContext: context, viewport: viewport }).promise;
  const base64 = canvas.toDataURL('image/jpeg', 0.85);
  return base64.split(',')[1]; 
};

// --- 2. Convertir Imagen Normal a Base64 ---
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
  if (!API_KEY) throw new Error("Falta API Key de OpenAI");

  try {
    console.log(`📄 Analizando: ${file.name}`);

    let base64Data = '';
    let mimeType = 'image/jpeg';

    // Detectar si es PDF o Imagen
    if (file.type === 'application/pdf') {
      base64Data = await convertPdfToImage(file);
    } else {
      base64Data = await fileToBase64(file);
      mimeType = (file.type && file.type.startsWith('image/')) ? file.type : 'image/jpeg';
    }

    // --- LLAMADA A OPENAI CON PROMPT EXPERTO ---
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
                  Actúa como un auditor contable experto. Analiza este documento visualmente.
                  Extrae la información con máxima precisión para rellenar un formulario financiero.
                  
                  NECESITO ESTE FORMATO JSON EXACTO (Respeta los nombres de las claves):
                  {
                    "tipo": "Factura" o "Ticket",
                    "fecha": "DD/MM/YYYY",
                    "proveedor": "Nombre LEGAL COMPLETO de la empresa emisora",
                    "concepto_principal": "Descripción breve del servicio/producto principal (4-5 palabras)",
                    "base_imponible": 0.00 (Subtotal sin impuestos),
                    "impuestos_porcentaje": 0 (Ej: 21),
                    "total": 0.00 (Importe final),
                    "conceptos": ["Lista de items"]
                  }

                  - Si falta la Base Imponible, cálculala (Total - Impuestos).
                  - El "concepto_principal" debe ser claro para un humano.
                ` 
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
      const err = await response.json();
      throw new Error(err.error?.message || "Error OpenAI");
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const json = JSON.parse(content);

    console.log("✅ Datos extraídos:", json);

    // --- MAPEO FINAL DE DATOS PARA TU INTERFAZ ---
    return {
      // Campos estándar
      documentType: json.tipo || 'Desconocido',
      document_type: json.tipo || 'Desconocido', // Compatibilidad
      type: json.tipo || 'Desconocido',          // Compatibilidad
      
      date: json.fecha || '',
      supplier: json.proveedor || 'Proveedor Desconocido',
      
      // CAMPOS NUEVOS QUE TE FALTABAN EN PANTALLA:
      // Usamos 'concept' o 'description' según use tu Frontend
      concept: json.concepto_principal || 'Varios', 
      description: json.concepto_principal || 'Varios', 
      
      base: typeof json.base_imponible === 'number' ? json.base_imponible : parseFloat(json.base_imponible) || 0,
      tax_percent: typeof json.impuestos_porcentaje === 'number' ? json.impuestos_porcentaje : parseFloat(json.impuestos_porcentaje) || 0,
      
      total: typeof json.total === 'number' ? json.total : parseFloat(json.total) || 0,
      items: json.conceptos || []
    } as any;

  } catch (error: any) {
    console.error('❌ Error:', error);
    throw error;
  }
};
