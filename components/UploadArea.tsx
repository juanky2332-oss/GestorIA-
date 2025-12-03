import React, { useRef, useState } from 'react';
import { Camera, UploadCloud, FileText, Layers, ScanLine, Image as ImageIcon } from 'lucide-react';

interface UploadAreaProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export const UploadArea: React.FC<UploadAreaProps> = ({ onFilesSelected, disabled }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      onFilesSelected(Array.from(event.target.files));
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(event.dataTransfer.files));
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
  };

  return (
    <div 
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`
        relative group cursor-pointer w-full max-w-3xl mx-auto
        min-h-[420px] flex flex-col items-center justify-center
        border-2 border-dashed rounded-[2.5rem] transition-all duration-500 ease-out
        overflow-hidden select-none px-6
        ${disabled 
          ? 'border-slate-800 opacity-50 cursor-not-allowed bg-slate-900/50' 
          : isDragging
            ? 'border-blue-400 bg-blue-500/10 scale-[1.02] shadow-[0_0_60px_-15px_rgba(59,130,246,0.5)]'
            : 'border-slate-800 hover:border-slate-600 bg-slate-900/40 hover:bg-slate-900/80 hover:shadow-2xl hover:shadow-black/50'
        }
      `}
    >
      <input 
        ref={inputRef}
        type="file" 
        accept="image/*,application/pdf" 
        multiple 
        className="hidden" 
        onChange={handleFileChange}
        disabled={disabled}
      />

      {/* Decorative Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[2.5rem]">
         <div className={`absolute -top-32 -right-32 w-80 h-80 bg-blue-600/10 rounded-full blur-[80px] transition-opacity duration-700 ${isDragging ? 'opacity-100' : 'opacity-30'}`} />
         <div className={`absolute -bottom-32 -left-32 w-80 h-80 bg-purple-600/10 rounded-full blur-[80px] transition-opacity duration-700 ${isDragging ? 'opacity-100' : 'opacity-30'}`} />
      </div>

      <div className="z-10 flex flex-col items-center text-center space-y-8 w-full">
        
        {/* Main Icon Group */}
        <div className="relative pt-4">
          <div className={`absolute inset-0 bg-blue-500/20 blur-3xl rounded-full transition-opacity duration-500 ${isDragging ? 'opacity-100' : 'opacity-0'}`} />
          
          <div className="flex items-end justify-center gap-6 pb-4">
            {/* Mobile/Camera Action */}
            <div className="flex flex-col items-center gap-3 group-hover:-translate-y-2 transition-transform duration-300 ease-out">
               <div className="w-14 h-14 bg-slate-800 rounded-2xl border border-slate-700 flex items-center justify-center shadow-lg group-hover:shadow-blue-900/20 group-hover:border-slate-600 transition-colors">
                  <Camera size={24} className="text-slate-400 group-hover:text-blue-400 transition-colors" />
               </div>
               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Foto</span>
            </div>

            {/* Desktop/File Action */}
            <div className="flex flex-col items-center gap-3 group-hover:-translate-y-6 transition-transform duration-300 ease-out delay-75 relative z-10 -mx-2">
               <div className={`w-24 h-24 bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl border border-slate-700 flex items-center justify-center shadow-2xl relative group-hover:scale-110 transition-transform duration-300 ${isDragging ? 'border-blue-400' : ''}`}>
                  <ScanLine size={48} className={`text-slate-200 relative z-10 transition-colors ${isDragging ? 'text-blue-400' : ''}`} />
                  {isDragging && <div className="absolute inset-0 bg-blue-500/10 rounded-3xl animate-pulse" />}
               </div>
               <span className={`text-xs font-bold uppercase tracking-widest transition-colors ${isDragging ? 'text-blue-400' : 'text-slate-300'}`}>
                  {isDragging ? '¡Suelta!' : 'Escanear'}
               </span>
            </div>

            {/* Batch Action */}
            <div className="flex flex-col items-center gap-3 group-hover:-translate-y-2 transition-transform duration-300 ease-out delay-100">
               <div className="w-14 h-14 bg-slate-800 rounded-2xl border border-slate-700 flex items-center justify-center shadow-lg group-hover:shadow-purple-900/20 group-hover:border-slate-600 transition-colors">
                  <Layers size={24} className="text-slate-400 group-hover:text-purple-400 transition-colors" />
               </div>
               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Lote</span>
            </div>
          </div>
        </div>
        
        {/* Text Content */}
        <div className="space-y-3 max-w-lg">
          <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-tight">
            {isDragging ? 'Suelta los archivos para procesar' : 'Toca para escanear documentos'}
          </h3>
          <p className="text-slate-400 text-base md:text-lg font-medium leading-relaxed max-w-md mx-auto">
            Compatible con <span className="text-slate-200">Facturas</span>, <span className="text-slate-200">Tickets</span> y <span className="text-slate-200">Albaranes</span>.
            <br className="hidden md:block"/> Sube uno o múltiples archivos a la vez.
          </p>
        </div>

        {/* Feature Badges */}
        <div className="flex flex-wrap justify-center gap-2 pt-2 opacity-60 group-hover:opacity-100 transition-opacity duration-300">
          <Badge icon={<FileText size={12} />} text="PDF" />
          <Badge icon={<ImageIcon size={12} />} text="JPG/PNG" />
          <Badge icon={<UploadCloud size={12} />} text="Auto-Detect" />
        </div>
      </div>
    </div>
  );
};

const Badge: React.FC<{ icon: React.ReactNode, text: string }> = ({ icon, text }) => (
  <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold uppercase tracking-wider border border-slate-700 flex items-center gap-1.5">
    {icon}
    <span>{text}</span>
  </span>
);