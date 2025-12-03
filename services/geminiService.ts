import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { DocumentData } from "../types";

// ✅ CORRECTO - Sin API key hardcodeada
const genAI = new GoogleGenerativeAI(import.meta.env?.VITE_API_KEY || "");

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]);
      }
    };
    reader.readAsDataURL(file);
  });

  return {
    inlineData: {
      data: await base64EncodedDataPromise,
      mimeType: file.type,
    },
  };
};

export const analyzeDocument = async (file: File): Promise<DocumentData> => {
  try {
    const imagePart = await fileToGenerativePart(file);
    
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            document_type: { 
              type: SchemaType.STRING,
              description: 'Tipo de documento: "TICKET", "FACTURA", "ALBARÁN", "PRESUPUESTO" o "OTRO".'
            },
            supplier: { 
              type: SchemaType.STRING,
              description: 'Nombre del proveedor o empresa emisora.'
            },
            date: { 
              type: SchemaType.STRING,
              description: 'Fecha del documento (DD/MM/YYYY).'
            },
            concept: { 
              type: SchemaType.STRING,
              description: 'Un resumen breve (max 5 palabras) del concepto principal o descripción de los ítems.'
            },
            tax_base: { 
              type: SchemaType.STRING,
              description: 'La base imponible (importe antes de impuestos) con moneda.'
            },
            taxes: { 
              type: SchemaType.STRING,
              description: 'El total de impuestos (IVA, IRPF, etc.) con moneda. Si es 0, pon "0.00 €".'
            },
            total: { 
              type: SchemaType.STRING,
              description: 'El importe total final con moneda.'
            },
          },
          required: ["document_type", "supplier", "date", "concept", "tax_base", "taxes", "total"],
        }
      }
    });

    const prompt = `Analiza este documento (imagen o PDF). 
Identifica el tipo de documento entre: TICKET, FACTURA, ALBARÁN o PRESUPUESTO.

Extrae los siguientes datos financieros.
Si algún campo no es visible o legible, usa "N/A" o "0.00 €".`;

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();
    
    if (!text) {
      throw new Error("No text response from AI");
    }

    const data = JSON.parse(text) as DocumentData;
    return data;

  } catch (error) {
    console.error("Error analyzing document:", error);
    throw error;
  }
};
