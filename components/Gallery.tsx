import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GalleryItem } from '../types';
import { Image as ImageIcon, Clock, History, Filter, Play, RefreshCw, Layers, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { ResultCard } from './ResultCard';

interface GalleryProps {
  items: GalleryItem[];
  setItems: React.Dispatch<React.SetStateAction<GalleryItem[]>>;
  onQueueAll?: () => void;
  // Added onViewPrompt to GalleryProps to fix type error in App.tsx
  onViewPrompt?: (pt: string, en: string) => void;
}

export const Gallery: React.FC<GalleryProps> = ({ items, setItems, onQueueAll, onViewPrompt }) => {
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [filter, setFilter] = useState<GalleryItem['status'] | 'all'>('all');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevItemsLength = useRef(items.length);

  const filteredItems = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter(i => i.status === filter);
  }, [items, filter]);

  const counts = useMemo(() => ({
    all: items.length,
    pending: items.filter(i => i.status === 'draft' || i.status === 'queued').length,
    rendering: items.filter(i => i.status === 'rendering').length,
    completed: items.filter(i => i.status === 'completed').length,
    error: items.filter(i => i.status === 'error').length
  }), [items]);

  useEffect(() => {
    if (items.length > prevItemsLength.current) {
        if (scrollContainerRef.current) scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        const firstItem = items[0];
        if (firstItem && (firstItem.status === 'rendering' || firstItem.status === 'draft' || firstItem.status === 'queued')) {
            setActiveItemId(firstItem.id);
        }
    }
    prevItemsLength.current = items.length;
    if (!activeItemId && items.length > 0) setActiveItemId(items[0].id);
  }, [items, activeItemId]);

  const handleRetryErrors = () => {
    setItems(prev => prev.map(i => i.status === 'error' ? { ...i, status: 'queued' } : i));
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500 opacity-50 p-12 border-2 border-dashed border-zinc-800 rounded-xl">
        <ImageIcon className="w-12 h-12 mb-4" />
        <p className="font-bold uppercase tracking-widest text-xs text-center">Inicie preenchendo o nome do produto ao lado</p>
      </div>
    );
  }

  const activeItem = items.find(i => i.id === activeItemId) || items[0];

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex gap-2 overflow-x-auto pb-1 w-full sm:w-auto">
                  {[
                    { id: 'all', label: 'Todos', icon: <Layers className="w-3 h-3" /> },
                    { id: 'queued', label: 'Pendentes', icon: <Clock className="w-3 h-3" /> },
                    { id: 'rendering', label: 'Renderizando', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
                    { id: 'completed', label: 'Concluídos', icon: <CheckCircle className="w-3 h-3" /> },
                    { id: 'error', label: 'Erros', icon: <AlertCircle className="w-3 h-3" /> }
                  ].map(f => (
                    <button 
                        key={f.id} 
                        onClick={() => setFilter(f.id as any)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all shrink-0 ${filter === f.id ? 'bg-amber-600 border-amber-500 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}
                    >
                        {f.icon} {f.label} <span className="opacity-50">({counts[f.id as keyof typeof counts]})</span>
                    </button>
                  ))}
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                  {counts.pending > 0 && onQueueAll && (
                      <button onClick={onQueueAll} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-black uppercase shadow-lg">
                          <Play className="w-3 h-3 fill-current" /> Renderizar {counts.pending} Pendentes
                      </button>
                  )}
                  {counts.error > 0 && (
                      <button onClick={handleRetryErrors} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-red-900/30 border border-red-900/50 text-red-400 rounded-lg text-[10px] font-black uppercase hover:bg-red-900/50">
                          <RefreshCw className="w-3 h-3" /> Reprocessar Erros
                      </button>
                  )}
              </div>
          </div>

          <div className="relative group">
              <div ref={scrollContainerRef} className="flex gap-3 overflow-x-auto custom-scrollbar pb-2 pt-1 px-1 snap-x scroll-smooth">
                  {filteredItems.map((item) => (
                      <div key={item.id} className="snap-start shrink-0 w-24 sm:w-28">
                        <ResultCard 
                            item={item} 
                            setItems={setItems} 
                            isActive={false} 
                            onSelect={() => setActiveItemId(item.id)}
                            isSelected={activeItemId === item.id}
                        />
                      </div>
                  ))}
                  {filteredItems.length === 0 && (
                      <div className="flex-1 py-10 text-center text-zinc-600 text-[10px] uppercase font-bold">Nenhum item com este status</div>
                  )}
              </div>
          </div>
      </div>

      <div className="animate-fade-in">
          {/* Passed onViewPrompt prop to ResultCard to fix prompt visualization */}
          <ResultCard item={activeItem} setItems={setItems} isActive={true} onViewPrompt={onViewPrompt} />
      </div>
    </div>
  );
};