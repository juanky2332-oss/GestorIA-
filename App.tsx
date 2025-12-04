import { useState, useEffect } from 'react';
import { UploadArea } from './components/UploadArea';
import { ResultCard } from './components/ResultCard';
import { BatchSummary } from './components/BatchSummary';
import { analyzeDocument } from './services/geminiService';
import { sendToN8N } from './services/n8nService';
import { DocumentData, AppStatus, BatchItem } from './types';
import { AlertTriangle, Loader2, CheckCircle2, FileText } from 'lucide-react';

export default function App() {
  const [status, setStatus] = useState<AppStatus>('idle');
  
  // Single mode state
  const [singleData, setSingleData] = useState<DocumentData | null>(null);
  const [currentSingleFile, setCurrentSingleFile] = useState<File | null>(null);
  const [singleFilePreview, setSingleFilePreview] = useState<{ url: string, type: string } | null>(null);

  // Batch mode state
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  useEffect(() => {
    return () => {
      if (singleFilePreview) URL.revokeObjectURL(singleFilePreview.url);
      batchItems.forEach(item => URL.revokeObjectURL(item.previewUrl));
    };
  }, [singleFilePreview, batchItems]);

  const handleFilesSelect = async (files: File[]) => {
    if (files.length === 0) return;
    setErrorMsg(null);
    const isBatch = files.length > 1 || batchItems.length > 0;

    if (!isBatch) {
      const file = files[0];
      setCurrentSingleFile(file);
      setStatus('analyzing');
      const url = URL.createObjectURL(file);
      setSingleFilePreview({ url, type: file.type });

      try {
        const result = await analyzeDocument(file);
        setSingleData(result);
        setStatus('review_single');
      } catch (error: any) {
        console.error("❌ Error:", error);
        setErrorMsg(`Error: ${error?.message || "Desconocido"}`);
        setStatus('error');
      }
    } else {
      setStatus('analyzing');
      setProcessingProgress({ current: 0, total: files.length });
      
      const newItems: BatchItem[] = [];
      let successCount = 0;

      for (let i = 0; i < files.length; i++) {
        setProcessingProgress({ current: i + 1, total: files.length });
        const file = files[i];
        try {
          const result = await analyzeDocument(file);
          const url = URL.createObjectURL(file);
          newItems.push({
            id: crypto.randomUUID(),
            file: file,
            previewUrl: url,
            data: result
          });
          successCount++;
        } catch (error) {
          console.error(`Error en fichero ${file.name}`, error);
        }
      }

      if (successCount > 0) {
        setBatchItems(prev => [...prev, ...newItems]);
        setStatus('review_batch');
      } else {
        setErrorMsg("Error al procesar todos los archivos.");
        setStatus('error');
      }
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setSingleData(null);
    setCurrentSingleFile(null);
    setBatchItems([]);
    setErrorMsg(null);
    setSingleFilePreview(null);
    setIsSending(false);
  };

  const handleConfirmSingle = async () => {
    if (!singleData || !currentSingleFile) return;
    setIsSending(true);
    try {
      await sendToN8N(singleData, currentSingleFile);
      setIsSending(false);
      setShowSuccessToast(true);
      setTimeout(() => { setShowSuccessToast(false); handleReset(); }, 2000);
    } catch (error) {
      console.error("Fallo n8n:", error);
      setIsSending(false);
      setErrorMsg("Error de conexión con el servidor.");
    }
  };

  const handleConfirmBatch = async () => {
    if (batchItems.length === 0) return;
    setIsSending(true);
    try {
      for (const item of batchItems) {
        await sendToN8N(item.data, item.file);
        await new Promise(r => setTimeout(r, 2000));
      }
      setIsSending(false);
      setShowSuccessToast(true);
      setTimeout(() => { setShowSuccessToast(false); handleReset(); }, 2000);
    } catch (error) {
      console.error("Fallo n8n lote:", error);
      setIsSending(false);
      setErrorMsg("Error al guardar el lote.");
    }
  };

  const handleRemoveBatchItem = (id: string) => {
    setBatchItems(prev => prev.filter(item => item.id !== id));
    if (batchItems.length <= 1 && batchItems.length > 0) {
       // Opcional: resetear si queda vacío
    }
  };

  return (
    // CAMBIO 1: Quitamos 'h-screen' fijo y ponemos 'min-h-screen' para que crezca si hace falta.
    // CAMBIO 2: 'w-full' para ocupar todo el ancho disponible.
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col font-sans overflow-x-hidden relative">
      
      {/* Header FULL WIDTH */}
      <header className="w-full py-6 px-4 md:px-8 text-center z-10 border-b border-white/5 bg-slate-950/50 backdrop-blur-md sticky top-0">
        <h1 className="text-3xl md:text-4xl font-bold text-white">
          Gestor<span className="text-blue-400">IA</span>
        </h1>
      </header>

      {/* Main Content FULL WIDTH */}
      {/* CAMBIO 3: Quitamos 'max-w-7xl' y 'mx-auto'. Ahora ocupa el 100%. */}
      <main className="flex-1 flex flex-col items-center w-full p-4 md:p-8 z-10">
        
        {status === 'idle' && !showSuccessToast && (
          <div className="w-full max-w-3xl mx-auto mt-8 animate-fadeIn">
             {/* El UploadArea seguirá teniendo un ancho máximo interno para no verse gigante */}
            <UploadArea onFilesSelected={handleFilesSelect} />
          </div>
        )}

        {status === 'analyzing' && (
          <div className="mt-20 text-center">
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-white">Analizando documento...</h3>
            <p className="text-slate-400 mt-2">{processingProgress.current} de {processingProgress.total}</p>
          </div>
        )}

        {status === 'review_single' && singleData && !showSuccessToast && (
          <div className="w-full h-full flex justify-center animate-fadeIn">
             {/* ResultCard ahora puede expandirse más si lo necesita */}
             <ResultCard 
              data={singleData} 
              filePreviewUrl={singleFilePreview?.url || null}
              fileType={singleFilePreview?.type || ''}
              onReset={handleReset}
              onConfirm={handleConfirmSingle}
              isSending={isSending}
              mode='standalone'
            />
          </div>
        )}

        {status === 'review_batch' && batchItems.length > 0 && !showSuccessToast && (
           <div className="w-full animate-fadeIn">
             <BatchSummary 
              items={batchItems}
              onRemoveItem={handleRemoveBatchItem}
              onConfirmAll={handleConfirmBatch}
              onAddMore={handleReset} 
              isSending={isSending}
            />
           </div>
        )}

        {status === 'error' && (
          <div className="w-full max-w-md mx-auto mt-10 bg-red-900/20 border border-red-500/50 p-8 rounded-2xl text-center backdrop-blur-sm">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-200 text-lg mb-6">{errorMsg}</p>
            <button onClick={handleReset} className="bg-red-600 px-8 py-3 rounded-xl text-white font-bold hover:bg-red-700 transition shadow-lg hover:shadow-red-500/20">Reintentar</button>
          </div>
        )}

        {showSuccessToast && (
           <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-md">
             <div className="bg-slate-900 border border-green-500/30 p-10 rounded-3xl text-center animate-bounce shadow-2xl shadow-green-500/10">
               <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-4" />
               <h3 className="text-3xl font-bold text-white">¡Guardado!</h3>
             </div>
           </div>
        )}

      </main>
    </div>
  );
}
