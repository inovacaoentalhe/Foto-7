
import React, { useState, useEffect } from 'react';
import { GalleryItem, AspectRatio, TextLayerConfig, TextStyle } from '../types';
import { BRAND_COLOR } from '../constants';
import { 
  Loader2, Download, Copy, RefreshCw, Type, Eye,
  Sliders, FileText, ArrowDownToLine, ShoppingBag, Palette, ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react';

interface ResultCardProps {
  item: GalleryItem;
  setItems: React.Dispatch<React.SetStateAction<GalleryItem[]>>;
  isActive?: boolean;
  onSelect?: () => void;
  isSelected?: boolean;
  onViewPrompt?: (pt: string, en: string) => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({ item, setItems, isActive = true, onSelect, isSelected = false, onViewPrompt }) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'prompt'>('visual');
  const [isDownloading, setIsDownloading] = useState(false);
  const [showPromptDetails, setShowPromptDetails] = useState(false);
  const [localPromptPt, setLocalPromptPt] = useState(item.data.promptPt);
  
  const [textConfig, setTextConfig] = useState<{
    title: TextLayerConfig;
    subtitle: TextLayerConfig;
    offer: TextLayerConfig;
  }>(item.textLayerSettings || {
    title: { yPercent: 15, visible: true, scale: 1, color: '#FFFFFF' },
    subtitle: { yPercent: 45, visible: true, scale: 1, color: '#FFFFFF' },
    offer: { yPercent: 80, visible: true, scale: 1, color: '#000000' }
  });

  const [currentTextStyle, setCurrentTextStyle] = useState<TextStyle>(item.textStyle || 'modern');
  const [editTitle, setEditTitle] = useState(item.data.copyTitle || "");
  const [editSubtitle, setEditSubtitle] = useState(item.data.copySubtitle || "");
  const [editOffer, setEditOffer] = useState(item.data.copyOffer || "");

  const isIntegratedText = item.creationSettings?.marketingDirection === 'Texto integrado';

  useEffect(() => {
    setLocalPromptPt(item.data.promptPt);
    setEditTitle(item.data.copyTitle || "");
    setEditSubtitle(item.data.copySubtitle || "");
    setEditOffer(item.data.copyOffer || "");
  }, [item.id]);

  useEffect(() => {
    if (isActive) {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, textLayerSettings: textConfig, textStyle: currentTextStyle } : i));
    }
  }, [textConfig, currentTextStyle, isActive]);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(item.data.finalPromptEn || "");
    alert("Prompt Técnico (EN) copiado!");
  };

  const handleRegenerate = () => {
    const newItem: GalleryItem = {
        ...item,
        id: crypto.randomUUID(),
        status: 'queued',
        timestamp: Date.now(),
        isRegenerated: true
    };
    setItems(prev => [newItem, ...prev]);
  };

  const handleRetry = () => {
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'queued' } : i));
  };

  const downloadMergedImage = async (resolution: 'hd' | 'ecommerce') => {
    if (!item.generatedImageUrl) return;
    setIsDownloading(true);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = item.generatedImageUrl;
    img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        let targetW, targetH;
        if (resolution === 'hd') {
            targetW = img.width; targetH = img.height;
        } else {
            const scale = 1200 / Math.min(img.width, img.height);
            targetW = img.width * scale; targetH = img.height * scale;
        }
        canvas.width = targetW; canvas.height = targetH;
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const link = document.createElement('a');
        link.download = `entalhe_${resolution}_${item.id}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', resolution === 'hd' ? 0.95 : 0.82); 
        link.click();
        setIsDownloading(false);
    };
  };

  if (!isActive) {
      return (
          <div onClick={onSelect} className={`group relative cursor-pointer rounded-lg overflow-hidden transition-all aspect-square border-2 bg-zinc-950 ${isSelected ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-zinc-800 hover:border-zinc-600'}`}>
              {item.generatedImageUrl ? (
                <img src={item.generatedImageUrl} className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full">
                    {item.status === 'rendering' ? <Loader2 className="w-5 h-5 animate-spin text-amber-500" /> : <div className={`w-2 h-2 rounded-full ${item.status === 'error' ? 'bg-red-500' : 'bg-zinc-700'}`} />}
                </div>
              )}
          </div>
      );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex flex-col md:flex-row animate-fade-in min-h-[600px]">
      <div className="flex-1 bg-zinc-950 relative flex items-center justify-center min-h-[400px]">
        {item.generatedImageUrl ? (
            <img src={item.generatedImageUrl} className="w-full h-full object-contain max-h-[70vh]" />
        ) : item.status === 'error' ? (
            <div className="text-center p-8 space-y-4">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                <h3 className="text-white font-bold">Algo deu errado na renderização</h3>
                <p className="text-xs text-zinc-500 max-w-xs mx-auto">O motor de imagem encontrou um problema temporário ou o prompt foi bloqueado.</p>
                <button onClick={handleRetry} className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold text-xs uppercase flex items-center gap-2 mx-auto"><RefreshCw className="w-3 h-3" /> Tentar Novamente</button>
            </div>
        ) : (
            <div className="text-center space-y-3 p-10">
                <Loader2 className="w-12 h-12 animate-spin text-amber-500 mx-auto" />
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{item.status === 'rendering' ? 'Renderizando Arte...' : 'Aguardando sua vez na fila...'}</p>
            </div>
        )}
      </div>

      <div className="w-full md:w-[350px] bg-zinc-900 border-l border-zinc-800 flex flex-col">
          <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex justify-between items-center">
              <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${item.status === 'completed' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' : 'bg-zinc-800 text-zinc-400'}`}>
                  Status: {item.status}
              </span>
          </div>

          <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-6">
              <div className="grid grid-cols-1 gap-2">
                  <button 
                    onClick={() => downloadMergedImage('hd')} 
                    disabled={item.status !== 'completed' || isDownloading}
                    className="w-full py-3 bg-amber-600 text-white rounded-xl flex items-center justify-center gap-3 text-xs font-black uppercase hover:bg-amber-500 shadow-lg disabled:opacity-30"
                  >
                      {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Download Final (HD)
                  </button>
                  <button 
                    onClick={handleRegenerate}
                    disabled={item.status === 'rendering' || item.status === 'queued'}
                    className="w-full py-3 bg-zinc-800 text-zinc-300 rounded-xl flex items-center justify-center gap-3 text-xs font-black uppercase hover:bg-zinc-700 transition-all disabled:opacity-30"
                  >
                      <RefreshCw className="w-4 h-4" /> Gerar Novamente
                  </button>
              </div>

              <div className="pt-4 border-t border-zinc-800 space-y-4">
                  <button 
                    onClick={() => onViewPrompt && onViewPrompt(item.data.promptPt, item.data.finalPromptEn || item.data.promptEn)}
                    className="w-full flex items-center justify-between py-3 px-4 bg-zinc-950 border border-zinc-800 rounded-lg text-[10px] font-black uppercase text-zinc-400 hover:text-white transition-colors group"
                  >
                      <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-zinc-600 group-hover:text-amber-500" /> Ver Prompt Final</span>
                      <Eye className="w-3 h-3" />
                  </button>
              </div>
          </div>
      </div>
    </div>
  );
};
