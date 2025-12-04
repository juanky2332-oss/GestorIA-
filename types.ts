export interface DocumentData {
  document_type: 'TICKET' | 'FACTURA' | 'ALBARÁN' | 'PRESUPUESTO' | 'OTRO';
  document_number: string; // <--- Nuevo campo para el número de documento
  total: string;
  tax_base: string;
  taxes: string;
  concept: string;
  supplier: string;
  date: string;

  // Campos numéricos opcionales para facilitar el envío a n8n
  baseNumeric?: number;
  taxNumeric?: number;
  totalNumeric?: number;
}

export interface BatchItem {
  id: string;
  file: File;
  previewUrl: string;
  data: DocumentData;
}

export type AppStatus = 'idle' | 'analyzing' | 'review_single' | 'review_batch' | 'success' | 'error';
