
import React, { useRef } from 'react';
import { Upload, X, Image as ImageIcon, Star, Trash2, Users, PenTool, AlertTriangle, Info, Plus, Search, Loader2, CheckCircle } from 'lucide-react';
import { FormData, ReferenceImage, ReferenceUsageType } from '../types';
import { REFERENCE_USAGE_TYPES } from '../constants';

interface ReferenceUploadProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  onAnalyze?: () => void;
  isAnalyzing?: boolean;
  productAnalysis?: string | null;
}

export const ReferenceUpload: React.FC<ReferenceUploadProps> = ({ 
  formData, 
  setFormData, 
  onAnalyze, 
  isAnalyzing, 
  productAnalysis 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      alert(`Formato não suportado: ${file.name}`);
      return;
    }
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    if (parseFloat(sizeMb) > 4) {
        if (!confirm(`Imagem grande (${sizeMb}MB). Imagens acima de 4MB podem demorar ou falhar. Deseja continuar?`)) return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        setFormData(prev => {
          const isFirst = prev.referenceImages.length === 0;
          const newImage: ReferenceImage = {
            id: crypto.randomUUID(),
            dataUrl,
            mimeType: file.type,
            fileName: file.name,
            width: img.width,
            height: img.height,
            sizeMb,
            isHero: isFirst,
            usageType: 'Formato'
          };
          return { ...prev, referenceImages: [...prev.referenceImages, newImage], useRefImages: true };
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const setHero = (id: string) => {
    setFormData(prev => ({ ...prev, referenceImages: prev.referenceImages.map(img => ({ ...img, isHero: img.id === id })) }));
  };

  const removeImage = (id: string) => {
    setFormData(prev => {
      const newImages = prev.referenceImages.filter(img => img.id !== id);
      if (newImages.length > 0 && !newImages.some(i => i.isHero)) newImages[0].isHero = true;
      return { ...prev, referenceImages: newImages, useRefImages: newImages.length > 0 };
    });
  };

  const heroImage = formData.referenceImages.find(img => img.isHero);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2">
                <Star className="w-3 h-3 text-amber-500 fill-amber-500" /> Imagem Principal (HERO)
            </label>
            <span className="text-[9px] text-zinc-600">Recomendado: 1 a 3 imagens</span>
        </div>
        
        {heroImage ? (
            <div className="space-y-3">
              <div className="relative aspect-square w-full bg-zinc-950 rounded-xl overflow-hidden border border-amber-500/30 group">
                  <img src={heroImage.dataUrl} alt="Hero" className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <button onClick={() => removeImage(heroImage.id)} className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-500 shadow-xl"><Trash2 className="w-5 h-5" /></button>
                  </div>
                  <div className="absolute top-3 left-3 bg-amber-500 text-black text-[9px] font-black px-2 py-0.5 rounded shadow-lg uppercase">HERO Ativa</div>
              </div>

              <div className="space-y-2">
                <button 
                  onClick={onAnalyze} 
                  disabled={isAnalyzing}
                  className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all border border-zinc-700"
                >
                  {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                  {isAnalyzing ? "Analisando..." : "Analisar Produto (AI)"}
                </button>
                
                {productAnalysis && (
                  <div className="p-3 bg-emerald-950/20 border border-emerald-900/50 rounded-lg flex gap-2 animate-fade-in">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">IA: Produto Detectado</p>
                      <p className="text-[10px] text-zinc-300 italic">"{productAnalysis}"</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
        ) : (
            <div onClick={() => fileInputRef.current?.click()} className="aspect-square w-full border-2 border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center bg-zinc-900/30 hover:bg-zinc-900/50 hover:border-amber-500/50 cursor-pointer transition-all group">
                <Upload className="w-8 h-8 text-zinc-700 group-hover:text-amber-500 mb-2" />
                <p className="text-xs text-zinc-500 font-bold uppercase">Clique para enviar</p>
                <p className="text-[9px] text-zinc-600 mt-1">PNG, JPG ou WEBP</p>
            </div>
        )}
      </div>

      {formData.referenceImages.length > 1 && (
        <div className="grid grid-cols-3 gap-2">
            {formData.referenceImages.map(img => !img.isHero && (
                <div key={img.id} className="relative aspect-square bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden group">
                    <img src={img.dataUrl} alt="ref" className="w-full h-full object-cover" />
                    <button onClick={() => setHero(img.id)} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Star className="w-4 h-4 text-white" /></button>
                </div>
            ))}
            <div onClick={() => fileInputRef.current?.click()} className="aspect-square border border-dashed border-zinc-800 rounded-lg flex items-center justify-center hover:bg-zinc-900 cursor-pointer text-zinc-700 transition-colors"><Plus className="w-5 h-5" /></div>
        </div>
      )}
      <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*" onChange={e => e.target.files && Array.from(e.target.files).forEach(processFile)} />

      <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-zinc-300">
              <Users className="w-4 h-4 text-purple-500" />
              <h3 className="text-sm font-semibold">Configurações de Fidelidade</h3>
          </div>
          
          <div className="space-y-3">
              <div className="flex items-center gap-3">
                  <input type="checkbox" id="lockFid" checked={formData.lockProduct} onChange={(e) => setFormData(p => ({ ...p, lockProduct: e.target.checked }))} className="w-4 h-4 accent-blue-500 rounded bg-zinc-900 border-zinc-700" />
                  <label htmlFor="lockFid" className="text-[11px] text-zinc-400 cursor-pointer flex items-center gap-1 font-bold">Travar silhueta e logo <Info className="w-2.5 h-2.5" title="Garante que o formato e logos da HERO não mudem." /></label>
              </div>
              {formData.lockProduct && (
                  <div className="p-2 bg-blue-900/10 border border-blue-900/30 rounded-lg flex gap-2">
                      <AlertTriangle className="w-3 h-3 text-blue-500 shrink-0 mt-0.5" />
                      <p className="text-[9px] text-blue-400 leading-tight"><b>Nota:</b> Travamento de fidelidade pode limitar sombras naturais e iluminação artística extrema.</p>
                  </div>
              )}
          </div>

          <div className="space-y-2 pt-2 border-t border-zinc-800">
              <label className="text-[9px] text-zinc-500 uppercase flex items-center gap-1"><PenTool className="w-3 h-3" /> Mudança Específica (Opcional)</label>
              <textarea value={formData.customPersonalization} onChange={(e) => setFormData(p => ({ ...p, customPersonalization: e.target.value }))} placeholder="Ex: Mudar nome na tábua de 'Joao' para 'Maria'." className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-[10px] text-white outline-none resize-none focus:border-amber-500 transition-all" rows={2} />
          </div>
      </div>
    </div>
  );
};
