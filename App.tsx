import { useState, useEffect } from 'react';
import { UploadArea } from './components/UploadArea';
import { ResultCard } from './components/ResultCard';
import { BatchSummary } from './components/BatchSummary';
import { analyzeDocument } from './services/geminiService';
import { DocumentData, AppStatus, BatchItem } from './types';
import { AlertTriangle, Loader2, CheckCircle2, FileText } from 'lucide-react';

export default function App() {
  const [status, setStatus] = useState<AppStatus>('idle');
  
  // Single mode state
  const [singleData, setSingleData] = useState<DocumentData | null>(null);
  const [singleFilePreview, setSingleFilePreview] = useState<{ url: string, type: string } | null>(null);

  // Batch mode state
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Cleanup object URLs
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
      // SINGLE MODE
      const file = files[0];
      setStatus('analyzing');
      const url = URL.createObjectURL(file);
      setSingleFilePreview({ url, type: file.type });

      try {
        const result = await analyzeDocument(file);
        setSingleData(result);
        setStatus('review_single');
      } catch (error) {
        console.error(error);
        setErrorMsg("No se pudo leer el documento. Intenta con mejor iluminación o verifica el formato.");
        setStatus('error');
      }
    } else {
      // BATCH MODE
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
          console.error(`Error processing file ${file.name}`, error);
        }
      }

      if (successCount > 0) {
        setBatchItems(prev => [...prev, ...newItems]);
        setStatus('review_batch');
      } else {
        setErrorMsg("Error al procesar el lote. Intenta con menos archivos.");
        setStatus('error');
      }
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setSingleData(null);
    setBatchItems([]);
    setErrorMsg(null);
    setSingleFilePreview(null);
    setIsSending(false);
  };

  // ✅ MODIFICADO: Conexión real con n8n
  const handleConfirmSingle = async () => {
    if (!singleData) return;
    setIsSending(true);
    
    try {
      // Webhook de n8n - reemplaza con tu URL real
      const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://tu-instancia.n8n.cloud/webhook/gestoria-docs';
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...singleData,
          timestamp: new Date().toISOString(),
          source: 'gestoria-app',
          mode: 'single'
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      setShowSuccessToast(true);
      setTimeout(() => {
        setShowSuccessToast(false);
        handleReset();
      }, 2000);
      
    } catch (error) {
      console.error('Error al enviar a n8n:', error);
      setErrorMsg('Error al conectar con el sistema. Verifica tu conexión.');
      setStatus('error');
    } finally {
      setIsSending(false);
    }
  };

  // ✅ MODIFICADO: Envío por lotes a n8n
  const handleConfirmBatch = async () => {
    if (batchItems.length === 0) return;
    setIsSending(true);
    
    try {
      const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://tu-instancia.n8n.cloud/webhook/gestoria-docs';
      
      const batchData = batchItems.map(item => ({
        ...item.data,
        fileName: item.file.name,
        fileSize: item.file.size,
        fileType: item.file.type
      }));
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documents: batchData,
          timestamp: new Date().toISOString(),
          source: 'gestoria-app',
          mode: 'batch',
          totalDocuments: batchItems.length
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      setShowSuccessToast(true);
      setTimeout(() => {
        setShowSuccessToast(false);
        handleReset();
      }, 2000);
      
    } catch (error) {
      console.error('Error al enviar lote a n8n:', error);
      setErrorMsg('Error al procesar el lote. Verifica tu conexión.');
      setStatus('error');
    } finally {
      setIsSending(false);
    }
  };

  const handleRemoveBatchItem = (id: string) => {
    setBatchItems(prev => prev.filter(item => item.id !== id));
    if (batchItems.length <= 1) {
      if (batchItems.length === 1) handleReset(); 
    }
  };

  return (
    // ✅ MODIFICADO: h-screen en lugar de min-h-screen + overflow-hidden
    <div className="h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-500/30 overflow-hidden relative">
      
      {/* ✅ MODIFICADO: Background Ambience - absolute en lugar de fixed */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-blue-900/10 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] w-[60%] h-[60%] bg-indigo-900/10 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="pt-8 pb-6 px-6 text-center z-10 relative flex-shrink-0">
        <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-medium text-slate-400 backdrop-blur-md">
          <FileText size={12} className="text-blue-500" />
          <span>Auditoría v2.0</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-2">
          Gestor<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">IA</span>
        </h1>
        <p className="text-slate-500 font-medium text-sm md:text-base max-w-md mx-auto">
          Plataforma centralizada de digitalización documental inteligente.
        </p>
      </header>

      {/* ✅ MODIFICADO: Main con overflow-y-auto para scroll interno */}
      <main className="flex-1 flex flex-col items-center justify-start p-4 md:p-6 w-full relative z-10 max-w-7xl mx-auto overflow-y-auto">
        
        {/* State: IDLE */}
        {status === 'idle' && !showSuccessToast && (
          <div className="w-full mt-4 md:mt-8 animate-fadeIn">
            <UploadArea onFilesSelected={handleFilesSelect} />
          </div>
        )}

        {/* State: ANALYZING */}
        {status === 'analyzing' && (
          <div className="flex flex-col items-center justify-center space-y-8 mt-12 animate-fadeIn w-full">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/30 blur-2xl rounded-full animate-pulse" />
              <div className="w-24 h-24 bg-slate-900 rounded-3xl border border-slate-800 flex items-center justify-center relative z-10 shadow-2xl">
                <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
              </div>
            </div>
            <div className="text-center space-y-3">
              <h3 className="text-2xl font-bold text-white tracking-tight">
                {processingProgress.total > 0 
                  ? `Analizando documento ${processingProgress.current} de ${processingProgress.total}`
                  : 'Digitalizando documento'
                }
              </h3>
              <p className="text-slate-400 text-lg">Extrayendo datos financieros y clasificando...</p>
              
              {/* Progress Bar for Batch */}
              {processingProgress.total > 1 && (
                <div className="w-72 h-1.5 bg-slate-800 rounded-full mt-6 overflow-hidden mx-auto">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 ease-out"
                    style={{ width: `${(processingProgress.current / processingProgress.total) * 100}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* State: REVIEW SINGLE */}
        {status === 'review_single' && singleData && !showSuccessToast && (
          <ResultCard 
            data={singleData} 
            filePreviewUrl={singleFilePreview?.url || null}
            fileType={singleFilePreview?.type || ''}
            onReset={handleReset}
            onConfirm={handleConfirmSingle}
            isSending={isSending}
            mode='standalone'
          />
        )}

        {/* State: REVIEW BATCH */}
        {status === 'review_batch' && batchItems.length > 0 && !showSuccessToast && (
          <BatchSummary 
            items={batchItems}
            onRemoveItem={handleRemoveBatchItem}
            onConfirmAll={handleConfirmBatch}
            onAddMore={handleReset} 
            isSending={isSending}
          />
        )}

        {/* State: ERROR */}
        {status === 'error' && (
          <div className="w-full max-w-md mx-auto mt-8 animate-shake">
            <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-8 text-center space-y-6 backdrop-blur-sm">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
                <AlertTriangle className="w-10 h-10 text-red-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Error de Lectura</h3>
                <p className="text-slate-400 leading-relaxed">{errorMsg}</p>
              </div>
              <button 
                onClick={handleReset}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3.5 rounded-xl transition-all border border-slate-700"
              >
                Intentar de nuevo
              </button>
            </div>
          </div>
        )}

        {/* SUCCESS TOAST */}
        {showSuccessToast && (
           <div className="fixed inset-0 flex items-center justify-center z-[200] animate-fadeIn bg-slate-950/60 backdrop-blur-sm p-4">
             <div className="bg-slate-900 border border-slate-800 p-8 md:p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center text-center space-y-6 max-w-sm w-full relative overflow-hidden animate-scaleIn">
               <div className="absolute inset-0 bg-green-500/5 pointer-events-none" />
               <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mb-2 border border-green-500/20">
                  <CheckCircle2 className="w-12 h-12 text-green-500" />
               </div>
               <div className="space-y-2">
                 <h3 className="text-3xl font-bold text-white tracking-tight">¡Guardado!</h3>
                 <p className="text-slate-400 font-medium">Información archivada correctamente.</p>
               </div>
             </div>
           </div>
        )}

      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-slate-700 text-xs z-10 relative flex-shrink-0">
        <p>&copy; 2024 GestorIA Enterprise Solutions</p>
      </footer>
    </div>
  );
}
