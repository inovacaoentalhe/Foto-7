
import React, { useState, useEffect, useRef } from 'react';
import { INITIAL_FORM_STATE } from './constants';
import { FormData, GalleryItem, HistoryMetadata, PromptPreviewData } from './types';
import { 
  generateCreativePrompts, 
  prepareTechnicalPrompt, 
  generateImageFromPrompt, 
  correctPortuguese,
  suggestFieldsFromBriefing,
  analyzeProductImage
} from './services/geminiService';
import { loadGalleryFromDB, saveGalleryToDB, loadDraftFromDB, saveDraftToDB } from './services/storageService';
import { addToHistory, exportData, importData, getHistoryMetadata, getStoredAmbiences } from './services/persistenceService';
import { Controls } from './components/Controls';
import { Gallery } from './components/Gallery';
import { Toast } from './components/Toast';
import { Aperture, Loader2, Play, Layers, RotateCcw, Settings, Download, Upload, Database, X, Sun, Moon, FileText, Copy, AlertTriangle } from 'lucide-react';

const MAX_CONCURRENCY = 1;

const useDebouncedEffect = (effect: () => void, deps: any[], delay: number) => {
  useEffect(() => {
    const handler = setTimeout(effect, delay);
    return () => clearTimeout(handler);
  }, [...deps, delay]);
};

export const App: React.FC = () => {
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_STATE);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
  const [isApplyingSuggestions, setIsApplyingSuggestions] = useState(false);
  const [isAnalyzingProduct, setIsAnalyzingProduct] = useState(false);
  const [productAnalysis, setProductAnalysis] = useState<string | null>(null);
  const [isLoadingDB, setIsLoadingDB] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [previewPrompt, setPreviewPrompt] = useState<PromptPreviewData | null>(null);
  const [previewTab, setPreviewTab] = useState<'pt' | 'en'>('pt');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'|'info'|'warning'} | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeRenders, setActiveRenders] = useState<string[]>([]);

  const showToast = (message: string, type: 'success'|'error'|'info'|'warning') => {
    setToast({ message, type });
  };

  useEffect(() => {
    const init = async () => {
      try {
        const [items, draft] = await Promise.all([loadGalleryFromDB(), loadDraftFromDB()]);
        setGalleryItems(items);
        const storedAmbiences = getStoredAmbiences();
        if (draft) {
             setFormData({ ...draft, customAmbiences: storedAmbiences });
        } else {
             setFormData(prev => ({ ...prev, customAmbiences: storedAmbiences }));
        }
      } catch (err: any) { 
        showToast("Erro ao carregar banco local.", "error");
      } finally { 
        setIsLoadingDB(false); 
      }
    };
    init();
  }, []);

  useDebouncedEffect(() => {
    if (!isLoadingDB) saveDraftToDB(formData);
    // Invalida o preview se os dados mudarem
    if (previewPrompt && previewPrompt.title === 'Visualização de Opções') {
        setPreviewPrompt(null);
    }
  }, [formData, isLoadingDB], 1000);

  useDebouncedEffect(() => {
    if (!isLoadingDB) saveGalleryToDB(galleryItems);
  }, [galleryItems, isLoadingDB], 1500);

  // Limpa análise se imagem de referência mudar
  useEffect(() => {
    if (formData.referenceImages.length === 0) {
      setProductAnalysis(null);
    }
  }, [formData.referenceImages]);

  useEffect(() => {
    const processQueue = async () => {
      if (activeRenders.length >= MAX_CONCURRENCY) return;
      const nextItem = galleryItems.find(item => item.status === 'queued' && !activeRenders.includes(item.id));
      if (nextItem) startRenderJob(nextItem);
    };
    processQueue();
  }, [galleryItems, activeRenders]);

  const startRenderJob = async (item: GalleryItem) => {
    if (!item || activeRenders.includes(item.id)) return;
    setActiveRenders(prev => [...prev, item.id]);
    setGalleryItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'rendering' } : i));

    try {
        const correctedPromptPt = await correctPortuguese(item.data.promptPt);
        const correctedNegativePt = await correctPortuguese(item.data.negativePt);
        const tech = await prepareTechnicalPrompt(correctedPromptPt, correctedNegativePt, item.creationSettings, item.referenceImages || []);
        const url = await generateImageFromPrompt(tech.finalPromptEn, item.referenceImages, item.aspectRatio);

        setGalleryItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'completed', generatedImageUrl: url, data: { ...i.data, promptPt: correctedPromptPt, negativePt: correctedNegativePt, promptEn: tech.promptEn, negativeEn: tech.negativeEn, finalPromptEn: tech.finalPromptEn } } : i));

        const historyItem: HistoryMetadata = { id: crypto.randomUUID(), date: new Date().toISOString(), productName: formData.productName, presetUsed: item.creationSettings?.objective || 'Geral', ambienceTitle: item.creationSettings?.ambienceDescription || 'Estúdio', aspectRatio: item.aspectRatio, promptFinalEn: tech.finalPromptEn, tags: [item.creationSettings?.objective || 'Geral'] };
        addToHistory(historyItem);
    } catch (error: any) {
        setGalleryItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error', errorMessage: error.message } : i));
        showToast("Erro na renderização. Tentando manter a fila.", "error");
    } finally {
        setActiveRenders(prev => prev.filter(id => id !== item.id));
    }
  };

  const handleGeneratePrompts = async (isMore: boolean = false) => {
    if (!formData.productName) {
        showToast("Digite o nome do produto.", "warning");
        return;
    }
    setIsGeneratingPrompts(true);
    try {
      const results = await generateCreativePrompts(formData);
      const allAmbiences = [...formData.suggestedAmbiences, ...formData.customAmbiences];
      const activeAmbience = allAmbiences.find(a => a.id === formData.selectedAmbienceId);

      const newItems: GalleryItem[] = results.map(result => ({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        data: result,
        referenceImages: [...formData.referenceImages],
        aspectRatio: formData.defaultAspectRatio,
        rotation: formData.defaultRotation,
        status: isMore ? 'draft' : 'queued',
        creationSettings: { objective: formData.objective, background: formData.background, catalogBackground: formData.catalogBackground, shadow: formData.shadow, angle: formData.angle, props: formData.props, propsEnabled: formData.props.length > 0, lockProduct: formData.lockProduct, ambienceDescription: activeAmbience?.description, tone: formData.tone, textPresence: formData.textPresence, customProps: formData.customProps, customPersonalization: formData.customPersonalization, marketingDirection: formData.marketingDirection }
      }));
      setGalleryItems(prev => [...newItems, ...prev]);
      showToast("Solicitação enviada para a fila.", "success");
    } catch (error: any) { 
        showToast(`Erro na IA: ${error.message}`, "error");
    } finally { 
        setIsGeneratingPrompts(false); 
    }
  };

  const handleAutoComplete = async () => {
    if (!formData.userBrief && !formData.finalBriefPt) {
        showToast("Briefing necessário.", "warning");
        return;
    }
    setIsApplyingSuggestions(true);
    try {
        const suggestions = await suggestFieldsFromBriefing(formData);
        setFormData(prev => ({ ...prev, ...suggestions, objective: (suggestions.objective as any) || prev.objective }));
        showToast("Configuração otimizada aplicada.", "success");
    } catch (e) {
        showToast("Erro na otimização.", "error");
    } finally {
        setIsApplyingSuggestions(false);
    }
  };

  const handleAnalyzeProduct = async () => {
    const hero = formData.referenceImages.find(img => img.isHero);
    if (!hero) {
      showToast("Selecione uma imagem de referência primeiro.", "warning");
      return;
    }
    setIsAnalyzingProduct(true);
    try {
      const analysis = await analyzeProductImage(hero.dataUrl, hero.mimeType);
      setProductAnalysis(analysis);
      showToast("Análise do produto concluída!", "success");
    } catch (e: any) {
      showToast("Erro ao analisar imagem.", "error");
    } finally {
      setIsAnalyzingProduct(false);
    }
  };

  const handleQueueAllPending = () => {
      setGalleryItems(prev => prev.map(item => (item.status === 'draft' ? { ...item, status: 'queued' } : item)));
  };

  const handleResetSession = () => {
    if (confirm("Deseja iniciar um novo produto? Isso limpará o formulário atual.")) {
        setFormData({ ...INITIAL_FORM_STATE, customAmbiences: getStoredAmbiences() });
        setProductAnalysis(null);
    }
  };

  const handleCopyPreview = () => {
    if (!previewPrompt) return;
    const text = previewTab === 'pt' ? previewPrompt.pt : previewPrompt.en;
    navigator.clipboard.writeText(text);
    showToast("Prompt copiado!", "success");
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-900'}`}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <nav className={`border-b ${theme === 'dark' ? 'border-zinc-800 bg-zinc-950/80' : 'border-zinc-200 bg-white/80'} backdrop-blur-md sticky top-0 z-50`}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-tr from-amber-500 to-orange-600 rounded-lg flex items-center justify-center shadow-lg"><Aperture className="text-white w-5 h-5" /></div>
                <div><h1 className="font-black text-sm uppercase tracking-tighter">Estúdio Imagem <span className="text-amber-500">v6</span></h1><p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Inovação Entalhe</p></div>
            </div>
            <div className="flex items-center gap-4">
                 <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors">
                    {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-600" />}
                 </button>
                 <button onClick={handleResetSession} className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[9px] font-black uppercase hover:bg-zinc-800">
                    <RotateCcw className="w-3 h-3" /> Reiniciar
                 </button>
                 <button onClick={() => setShowSettingsModal(true)} className="text-zinc-500 hover:text-amber-500 transition-colors"><Settings className="w-5 h-5" /></button>
            </div>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-5 lg:col-span-4 xl:col-span-3 sticky top-24">
                <Controls 
                  formData={formData} 
                  setFormData={setFormData} 
                  onGenerate={() => handleGeneratePrompts(false)} 
                  onAutoComplete={handleAutoComplete} 
                  onAnalyzeProduct={handleAnalyzeProduct}
                  onPreview={(pt, en) => setPreviewPrompt({ title: 'Visualização de Opções', pt, en })}
                  isGenerating={isGeneratingPrompts} 
                  isApplyingSuggestions={isApplyingSuggestions}
                  isAnalyzingProduct={isAnalyzingProduct}
                  productAnalysis={productAnalysis}
                />
            </div>

            <div className="md:col-span-7 lg:col-span-8 xl:col-span-9 space-y-6">
                <Gallery 
                  items={galleryItems} 
                  setItems={setGalleryItems} 
                  onQueueAll={handleQueueAllPending} 
                  onViewPrompt={(pt, en) => setPreviewPrompt({ title: 'Prompt desta Arte', pt, en })}
                />
            </div>
        </div>
      </main>

      {/* Modal de Preview do Prompt */}
      {previewPrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50">
                    <h3 className="text-sm font-black text-white uppercase flex items-center gap-3">
                        <FileText className="w-5 h-5 text-amber-500" /> {previewPrompt.title}
                    </h3>
                    <button onClick={() => setPreviewPrompt(null)} className="p-2 text-zinc-500 hover:text-white transition-colors bg-zinc-800 rounded-lg"><X className="w-5 h-5" /></button>
                </div>
                
                <div className="flex bg-zinc-950 border-b border-zinc-800">
                    <button onClick={() => setPreviewTab('pt')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${previewTab === 'pt' ? 'text-amber-500 border-b-2 border-amber-500 bg-amber-500/5' : 'text-zinc-500'}`}>Português</button>
                    <button onClick={() => setPreviewTab('en')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${previewTab === 'en' ? 'text-blue-500 border-b-2 border-blue-500 bg-blue-500/5' : 'text-zinc-500'}`}>English (Technical)</button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto custom-scrollbar bg-zinc-900/30 space-y-4">
                    <div className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-700 space-y-2">
                       <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Resumo do Planejamento</p>
                       <p className="text-xs text-zinc-300">
                          A IA usará a silhueta da sua imagem <b>{formData.referenceImages.find(i => i.isHero)?.fileName || 'de referência'}</b> e aplicará o estilo <b>{formData.objective}</b> com iluminação <b>{formData.shadow}</b> e fundo <b>{formData.background}</b>.
                       </p>
                       {formData.lockProduct && (
                          <div className="mt-2 p-2 bg-amber-950/30 border border-amber-900/50 rounded flex gap-2">
                             <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                             <p className="text-[10px] text-amber-400 font-bold uppercase">⚠️ Fidelidade Máxima Ativada: A IA manterá a forma exata do produto original.</p>
                          </div>
                       )}
                    </div>

                    <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 min-h-[150px]">
                        <p className="text-[10px] font-bold text-zinc-600 uppercase mb-2">Prompt Técnico Gerado</p>
                        <p className="text-xs text-zinc-400 leading-relaxed font-mono whitespace-pre-wrap">
                            {previewTab === 'pt' ? previewPrompt.pt : previewPrompt.en}
                        </p>
                    </div>
                </div>

                <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex gap-3">
                    <button onClick={() => setPreviewPrompt(null)} className="flex-1 py-3 text-[10px] font-black uppercase text-zinc-500 bg-zinc-900 rounded-xl border border-zinc-800 hover:bg-zinc-800">Fechar</button>
                    <button onClick={handleCopyPreview} className="flex-[2] py-3 text-[10px] font-black uppercase text-white bg-amber-600 rounded-xl hover:bg-amber-500 flex items-center justify-center gap-2 shadow-lg">
                        <Copy className="w-4 h-4" /> Copiar Prompt
                    </button>
                </div>
            </div>
        </div>
      )}

      {showSettingsModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative">
                <button onClick={() => setShowSettingsModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><Database className="w-5 h-5 text-amber-500" /> Banco de Dados Local</h3>
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => exportData(formData)} className="flex flex-col items-center gap-2 p-6 bg-zinc-950 border border-zinc-800 hover:border-amber-500 rounded-xl transition-all group">
                        <Download className="w-8 h-8 text-zinc-500 group-hover:text-amber-500" />
                        <span className="text-[10px] font-black text-zinc-300 uppercase">Exportar Backup</span>
                    </button>
                    <div onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-2 p-6 bg-zinc-950 border border-zinc-800 hover:border-blue-500 rounded-xl transition-all group cursor-pointer">
                        <Upload className="w-8 h-8 text-zinc-500 group-hover:text-blue-500" />
                        <span className="text-[10px] font-black text-zinc-300 uppercase">Importar Backup</span>
                        <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { const data = await importData(file); if (data) setFormData(data); showToast("Backup restaurado!", "success"); } e.target.value = ''; }} />
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
