export interface DocumentData {
  document_type: 'TICKET' | 'FACTURA' | 'ALBARÁN' | 'PRESUPUESTO' | 'OTRO';
  total: string;
  tax_base: string;
  taxes: string;
  concept: string;
  supplier: string;
  date: string;
}

export interface BatchItem {
  id: string;
  file: File;
  previewUrl: string;
  data: DocumentData;
}

export type AppStatus = 'idle' | 'analyzing' | 'review_single' | 'review_batch' | 'success' | 'error';