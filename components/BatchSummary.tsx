import React, { useState } from 'react';
import { BatchItem } from '../types';
import { Trash2, Eye, Check, Plus, X, FileText } from 'lucide-react';
import { ResultCard } from './ResultCard';

interface BatchSummaryProps {
  items: BatchItem[];
  onRemoveItem: (id: string) => void;
  onConfirmAll: () => void;
  onAddMore: () => void;
  isSending: boolean;
}

export const BatchSummary: React.FC<BatchSummaryProps> = ({ 
  items, 
  onRemoveItem, 
  onConfirmAll,
  onAddMore,
  isSending 
}) => {
  const [selectedItem, setSelectedItem] = useState<BatchItem | null>(null);

  // Parse strings "100.00 €" to numbers for total calculation
  const totalSum = items.reduce((acc, item) => {
    // Remove non-numeric characters except dot and comma
    const cleanStr = item.data.total.replace(/[^0-9,.]/g, '').replace(',', '.');
    const val = parseFloat(cleanStr);
    return acc + (isNaN(val) ? 0 : val);
  }, 0);

  // Simple formatter
  const formattedTotal = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalSum);

  return (
    <div className="w-full max-w-6xl mx-auto animate-fadeIn pb-32">
      
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-8 gap-6">
        <div>
           <h2 className="text-3xl font-bold text-white tracking-tight">Resumen del Lote</h2>
           <p className="text-slate-400 mt-1">{items.length} documentos listos para guardar</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 px-8 py-4 rounded-2xl text-right shadow-lg">
           <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Total Acumulado</p>
           <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">{formattedTotal}</p>
        </div>
      </div>

      {/* Grid of Mini Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {items.map((item) => (
          <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-600 transition-all group relative hover:-translate-y-1 hover:shadow-xl">
            <div className="flex justify-between items-start mb-3">
              <span className="text-[10px] font-bold px-2.5 py-1 bg-slate-800 rounded-lg text-slate-300 border border-slate-700 uppercase tracking-wider">
                {item.data.document_type}
              </span>
              <button 
                onClick={() => onRemoveItem(item.id)}
                className="text-slate-600 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                title="Eliminar del lote"
              >
                <Trash2 size={16} />
              </button>
            </div>
            
            <div className="flex items-center gap-3 mb-4">
               <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center shrink-0 border border-slate-800">
                  <FileText className="text-blue-500" size={18} />
               </div>
               <div className="overflow-hidden">
                 <p className="text-white font-semibold truncate text-sm">{item.data.supplier}</p>
                 <p className="text-slate-500 text-xs truncate">{item.data.concept}</p>
               </div>
            </div>

            <div className="flex justify-between items-center mt-auto pt-3 border-t border-slate-800/50">
              <span className="text-lg font-bold text-slate-200">{item.data.total}</span>
              <button 
                onClick={() => setSelectedItem(item)}
                className="text-xs text-blue-400 hover:text-white font-semibold flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500 px-3 py-1.5 rounded-lg border border-blue-500/20 transition-all"
              >
                <Eye size={12} /> Revisar
              </button>
            </div>
          </div>
        ))}

        {/* Add More Button */}
        <button 
          onClick={onAddMore}
          className="border-2 border-dashed border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-slate-500 hover:text-blue-400 hover:border-blue-500/50 hover:bg-slate-900/50 transition-all min-h-[180px] group"
        >
          <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
             <Plus size={24} />
          </div>
          <span className="font-medium text-sm">Añadir documentos</span>
        </button>
      </div>

      {/* Fixed Bottom Bar for Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-slate-950/80 backdrop-blur-xl border-t border-slate-800 z-50">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-4">
           <button 
             onClick={onAddMore} 
             className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-4 rounded-xl transition-colors md:flex-none md:w-56 border border-slate-700"
           >
             Cancelar / Nuevo Lote
           </button>
           <button 
             onClick={onConfirmAll}
             disabled={isSending}
             className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-900/20 flex items-center justify-center gap-3 transition-all active:scale-[0.99]"
           >
             {isSending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
             ) : (
               <Check size={20} />
             )}
             <span>{isSending ? 'Procesando...' : `Confirmar y Guardar (${items.length})`}</span>
           </button>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 w-full max-w-lg rounded-[2rem] border border-slate-700 shadow-2xl overflow-hidden animate-scaleIn flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-slate-800 bg-slate-900 shrink-0">
               <span className="text-white font-semibold">Detalle del Documento</span>
               <button 
                 onClick={() => setSelectedItem(null)} 
                 className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"
               >
                 <X size={20} />
               </button>
            </div>
            <div className="p-4 overflow-y-auto">
              <ResultCard 
                data={selectedItem.data}
                filePreviewUrl={selectedItem.previewUrl}
                fileType={selectedItem.file.type}
                mode="modal"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};