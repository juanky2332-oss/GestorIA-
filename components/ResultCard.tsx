import React, { useState } from 'react';
import { Calendar, Building2, Eye, X, Calculator, Percent, FileText, Send, Trash2 } from 'lucide-react';
import { DocumentData } from '../types';

interface ResultCardProps {
  data: DocumentData;
  filePreviewUrl: string | null;
  fileType: string;
  onReset?: () => void;
  onConfirm?: () => void;
  isSending?: boolean;
  mode?: 'standalone' | 'modal';
}

export const ResultCard: React.FC<ResultCardProps> = ({ 
  data, 
  filePreviewUrl, 
  fileType, 
  onReset, 
  onConfirm,
  isSending = false,
  mode = 'standalone'
}) => {
  const [showPreview, setShowPreview] = useState(false);

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'FACTURA': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'TICKET': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'ALBARÁN': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'PRESUPUESTO': return 'bg-teal-500/20 text-teal-300 border-teal-500/30';
      default: return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  return (
    <>
      <div className={`w-full ${mode === 'standalone' ? 'max-w-lg mx-auto' : 'h-full'} animate-fadeIn`}>
        
        {mode === 'standalone' && (
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-blue-500/30 blur-2xl rounded-full" />
              <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-800 relative z-10 shadow-xl shadow-black/50">
                 <FileText className="w-8 h-8 text-blue-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Revisión de Datos
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Verifica que la información extraída sea correcta
            </p>
          </div>
        )}

        {/* Main Info Card */}
        <div className={`bg-slate-900/80 backdrop-blur-sm rounded-3xl border border-slate-800 overflow-hidden shadow-2xl relative ${mode === 'standalone' ? 'mb-8' : 'mb-0'}`}>
          {/* Top Gradient Line */}
          <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 opacity-80" />
          
          <div className="p-6 space-y-6">
            
            {/* Header: Type & Supplier */}
            <div className="flex justify-between items-start">
              <div className="space-y-3">
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border ${getBadgeColor(data.document_type)}`}>
                  {data.document_type}
                </span>
                <div className="flex items-center gap-3 text-white">
                  <div className="p-2 bg-slate-800 rounded-lg">
                    <Building2 size={18} className="text-slate-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Proveedor</p>
                    <p className="font-semibold text-lg leading-tight truncate max-w-[180px]">{data.supplier}</p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="flex flex-col items-end gap-1">
                   <div className="flex items-center gap-2 text-slate-400 text-sm bg-slate-950/50 px-3 py-1.5 rounded-lg border border-slate-800/50">
                    <Calendar size={14} />
                    <span className="font-mono font-medium">{data.date}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Concept Box */}
            <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
               <div className="flex items-start gap-3">
                 <div className="mt-0.5">
                    <FileText size={16} className="text-blue-400" />
                 </div>
                 <div className="flex-1">
                   <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Concepto Detectado</p>
                   <p className="text-slate-200 text-sm font-medium leading-relaxed">{data.concept}</p>
                 </div>
               </div>
            </div>

            {/* Financial Details */}
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/30 p-3 rounded-xl border border-slate-800/50">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Calculator size={14} />
                    <span className="text-xs font-medium uppercase">Base</span>
                  </div>
                  <span className="text-slate-200 font-mono font-semibold">{data.tax_base}</span>
                </div>
                <div className="bg-slate-800/30 p-3 rounded-xl border border-slate-800/50">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Percent size={14} />
                    <span className="text-xs font-medium uppercase">Impuestos</span>
                  </div>
                  <span className="text-slate-200 font-mono font-semibold">{data.taxes}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-between items-end">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest pb-1.5">Total a Pagar</span>
                <span className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight">{data.total}</span>
              </div>
            </div>
            
            {/* View Document Button */}
             <button 
                onClick={() => setShowPreview(true)}
                className="w-full group flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3.5 rounded-xl border border-slate-700 transition-all text-sm font-medium mt-2"
              >
                <Eye size={18} className="group-hover:text-white transition-colors" />
                <span className="group-hover:text-white transition-colors">Ver documento original</span>
              </button>

          </div>
        </div>

        {/* Action Buttons Area */}
        {mode === 'standalone' && onReset && onConfirm && (
          <div className="grid grid-cols-2 gap-4 mt-6">
            <button 
              onClick={onReset}
              disabled={isSending}
              className="flex items-center justify-center gap-2 bg-red-500/5 hover:bg-red-500/10 text-red-400 hover:text-red-300 font-semibold py-4 rounded-xl border border-red-500/10 hover:border-red-500/20 transition-all active:scale-95"
            >
              <Trash2 size={20} />
              <span>Descartar</span>
            </button>
            
            <button 
              onClick={onConfirm}
              disabled={isSending}
              className={`
                flex items-center justify-center gap-2 
                font-bold py-4 rounded-xl shadow-lg transition-all group
                ${isSending 
                  ? 'bg-slate-800 text-slate-400 cursor-wait border border-slate-700' 
                  : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-blue-900/20 active:scale-95'
                }
              `}
            >
              {isSending ? (
                 <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send size={20} className="group-hover:translate-x-1 transition-transform" />
              )}
              <span>{isSending ? 'Guardando...' : 'Validar y Guardar'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Document Preview Modal */}
      {showPreview && filePreviewUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div 
            className="bg-slate-900 w-full max-w-5xl h-[90vh] rounded-3xl flex flex-col overflow-hidden shadow-2xl border border-slate-700 animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-5 border-b border-slate-800 bg-slate-900 shrink-0">
              <div>
                <h3 className="text-white font-semibold flex items-center gap-2 text-lg">
                  <Eye size={20} className="text-blue-400"/> 
                  Documento Original
                </h3>
                <p className="text-slate-500 text-xs mt-1">Vista previa del archivo subido</p>
              </div>
              <button 
                onClick={() => setShowPreview(false)}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors border border-slate-700"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 bg-slate-950 overflow-hidden relative flex items-center justify-center p-4 md:p-8">
               {/* Pattern Background */}
               <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#4b5563 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
               
               <div className="relative z-10 w-full h-full flex items-center justify-center">
                 {fileType === 'application/pdf' ? (
                  <iframe 
                    src={filePreviewUrl} 
                    className="w-full h-full rounded-xl bg-white shadow-2xl border border-slate-700" 
                    title="Document Preview"
                  />
                ) : (
                  <img 
                    src={filePreviewUrl} 
                    alt="Document Preview" 
                    className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border border-slate-700"
                  />
                )}
               </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};