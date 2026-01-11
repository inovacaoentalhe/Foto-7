import React, { useState, useMemo } from 'react';
import { AppMode, ArtStyle, CameraAngle, FormData, MarketingTone, ShadowType, TextPresence, Ambience, BackgroundType, CatalogBackgroundType } from '../types';
import { generateStructuredBrief, assembleFinalPrompt, getMaterialDescriptors } from '../services/geminiService';
import { saveStoredAmbience, deleteStoredAmbience } from '../services/persistenceService';
import { 
  Sparkles, Layers, Megaphone, BookOpen, RefreshCw, 
  Layout, Palette, ChevronDown, Plus, Trash2, Settings2,
  Lock, X, Loader2, Info, ChevronRight, ChevronLeft, Eye, EyeOff, FileText, Search
} from 'lucide-react';
import { ReferenceUpload } from './ReferenceUpload';
import { PresetsModule } from './PresetsModule';

interface ControlsProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  onGenerate: () => void;
  onAutoComplete: () => void;
  onAnalyzeProduct: () => void;
  onPreview: (pt: string, en: string) => void;
  isGenerating: boolean;
  isApplyingSuggestions: boolean;
  isAnalyzingProduct?: boolean;
  productAnalysis?: string | null;
}

export const Controls: React.FC<ControlsProps> = ({ 
  formData, 
  setFormData, 
  onGenerate, 
  onAutoComplete,
  onAnalyzeProduct,
  onPreview,
  isGenerating, 
  isApplyingSuggestions,
  isAnalyzingProduct,
  productAnalysis
}) => {
  // Added missing state to fix the "Cannot find name 'showAllAmbiences'" error.
  const [showAllAmbiences, setShowAllAmbiences] = useState(false);
  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);
  const [newPropInput, setNewPropInput] = useState('');

  const isAdvanced = formData.uiMode === 'advanced';
  const step = formData.wizardStep;

  const isSocial = formData.objective === AppMode.SOCIAL;
  const isCatalog = formData.objective === AppMode.CATALOG;

  const canAdvanceStep1 = formData.productName.trim().length > 0;
  const canGenerate = canAdvanceStep1;

  const handleChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleModeChange = (mode: AppMode) => {
      let newAspectRatio = formData.defaultAspectRatio;
      let newMarketingDirection = formData.marketingDirection;
      if (mode === AppMode.CATALOG) {
          newAspectRatio = '1:1';
          newMarketingDirection = 'Espaço reservado';
      }
      if (mode === AppMode.SOCIAL) {
          newAspectRatio = '3:4';
      }
      setFormData(prev => ({
          ...prev,
          objective: mode,
          defaultAspectRatio: newAspectRatio,
          marketingDirection: newMarketingDirection
      }));
  };

  const nextStep = () => handleChange('wizardStep', Math.min(step + 1, 3));
  const prevStep = () => handleChange('wizardStep', Math.max(step - 1, 1));

  const addProp = () => {
    if (newPropInput.trim()) {
        setFormData(prev => ({ ...prev, props: [...prev.props, newPropInput.trim()] }));
        setNewPropInput('');
    }
  };

  const removeProp = (prop: string) => {
    setFormData(prev => ({ ...prev, props: prev.props.filter(propToRemove => propToRemove !== prop) }));
  };

  const handleGenerateBrief = async () => {
    if (!formData.productName) return;
    setIsGeneratingBriefing(true);
    try {
      const briefData = await generateStructuredBrief(formData);
      setFormData(prev => ({
        ...prev,
        finalBriefPt: briefData.brief_pt || prev.finalBriefPt,
        socialCopyTitle: briefData.copy_pt?.title || prev.socialCopyTitle,
        socialCopySubtitle: briefData.copy_pt?.subtitle || prev.socialCopySubtitle,
        socialCopyOffer: briefData.copy_pt?.offer || prev.socialCopyOffer,
        briefingStatus: 'automático',
        marketingDirection: 'Texto integrado' 
      }));
    } catch (e: any) {
      alert("Erro ao gerar briefing: " + e.message);
    } finally {
      setIsGeneratingBriefing(false);
    }
  };

  const handleLocalPreview = () => {
    // Monta um assunto base em PT para o preview
    const subjectPt = `PRODUTO: ${formData.productName}. DETECÇÃO: ${productAnalysis || 'Não analisado'}. MATERIAL: ${formData.material}. CENÁRIO: ${formData.userBrief || formData.finalBriefPt || 'Estúdio Profissional'}.`;
    const materialDesc = getMaterialDescriptors(formData.material, formData.productName);
    
    const promptEnPreview = assembleFinalPrompt(subjectPt, materialDesc, formData);
    const promptPtPreview = assembleFinalPrompt(subjectPt, materialDesc, formData);

    onPreview(promptPtPreview, promptEnPreview);
  };

  const allAmbiences = useMemo(() => {
    return [...formData.suggestedAmbiences, ...formData.customAmbiences];
  }, [formData.suggestedAmbiences, formData.customAmbiences]);

  const topAmbiences = useMemo(() => allAmbiences.slice(0, 5), [allAmbiences]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl animate-fade-in flex flex-col h-full overflow-hidden">
      {/* Header com Toggle Simple/Advanced */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
           <Settings2 className="w-4 h-4 text-[#FCB82E]" /> Estúdio
        </h2>
        <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800">
            <button 
                onClick={() => handleChange('uiMode', 'simple')}
                className={`px-3 py-1 text-[10px] font-black uppercase rounded-md transition-all ${formData.uiMode === 'simple' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
                Simples
            </button>
            <button 
                onClick={() => handleChange('uiMode', 'advanced')}
                className={`px-3 py-1 text-[10px] font-black uppercase rounded-md transition-all ${formData.uiMode === 'advanced' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
                Avançado
            </button>
        </div>
      </div>

      <PresetsModule formData={formData} setFormData={setFormData} />

      {/* Indicador de Progresso (Wizard) */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-zinc-800">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${step === i ? 'bg-amber-500 text-black' : step > i ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
              {i}
            </div>
            {i < 3 && <div className={`w-8 h-0.5 mx-2 ${step > i ? 'bg-emerald-500' : 'bg-zinc-800'}`} />}
          </div>
        ))}
        <span className="text-[10px] font-bold text-zinc-500 uppercase ml-auto">
          {step === 1 ? 'Produto' : step === 2 ? 'Imagens' : 'Estilo'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
        {step === 1 && (
          <div className="space-y-6 animate-slide-in">
             <div className="space-y-4">
               <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                   <BookOpen className="w-4 h-4 text-blue-400" /> Detalhes do Produto
               </h3>
               <div className="space-y-3">
                   <div className="relative">
                       <label className="text-[9px] font-bold text-zinc-500 uppercase mb-1 block">Nome do Produto</label>
                       <input 
                           type="text" 
                           value={formData.productName} 
                           onChange={e => handleChange('productName', e.target.value)} 
                           placeholder="Ex: Tábua de Churrasco Premium" 
                           className={`bg-zinc-950 border rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500 w-full ${formData.productName.trim().length === 0 ? 'border-red-900/50' : 'border-zinc-800'}`} 
                       />
                   </div>
                   {isAdvanced && (
                     <div>
                       <label className="text-[9px] font-bold text-zinc-500 uppercase mb-1 block">Material</label>
                       <input type="text" value={formData.material} onChange={e => handleChange('material', e.target.value)} placeholder="Ex: Madeira Teca, Aço Inox" className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500 w-full" />
                     </div>
                   )}
               </div>

               <div className="space-y-1">
                 <label className="text-[9px] font-bold text-zinc-500 uppercase flex items-center gap-1">Objetivo de Uso <Info className="w-2.5 h-2.5" title="Define o contexto visual e formato padrão." /></label>
                 <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                     {Object.values(AppMode).map(mode => (
                         <button key={mode} onClick={() => handleModeChange(mode)} className={`py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${formData.objective === mode ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>
                             {mode}
                         </button>
                     ))}
                 </div>
               </div>
             </div>

             {isAdvanced && (
               <div className="space-y-3 pt-4 border-t border-zinc-800">
                  <h3 className="text-sm font-semibold text-zinc-400 flex items-center gap-2">Briefing Manual</h3>
                  <textarea value={formData.userBrief} onChange={(e) => handleChange('userBrief', e.target.value)} placeholder="Descreva o contexto desejado..." className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-white h-24 outline-none resize-none focus:border-blue-500" />
                  <button onClick={handleGenerateBrief} disabled={!formData.productName || isGeneratingBriefing} className="w-full bg-zinc-800 hover:bg-zinc-700 text-[10px] font-black uppercase text-zinc-300 py-3 rounded-lg flex items-center justify-center gap-2 border border-zinc-700 transition-all">
                    {isGeneratingBriefing ? <Loader2 className="animate-spin w-3 h-3" /> : <Sparkles className="w-3 h-3 text-[#FCB82E]" />} Gerar Briefing (AI)
                  </button>
               </div>
             )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-slide-in">
             <ReferenceUpload 
              formData={formData} 
              setFormData={setFormData} 
              onAnalyze={onAnalyzeProduct} 
              isAnalyzing={isAnalyzingProduct} 
              productAnalysis={productAnalysis} 
             />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-slide-in">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-[#FCB82E] flex items-center gap-2"><Layout className="w-4 h-4" /> Estética e Fotografia</h3>
                
                {isAdvanced && (
                  <div className="space-y-3">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase">Estilo de Direção</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => !isCatalog && handleChange('marketingDirection', 'Texto integrado')} 
                            className={`py-2 px-3 rounded-lg border text-[10px] font-black uppercase transition-all ${formData.marketingDirection === 'Texto integrado' ? 'bg-amber-900/20 border-[#FCB82E] text-[#FCB82E]' : isCatalog ? 'bg-zinc-900 border-zinc-800 text-zinc-700 cursor-not-allowed' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}
                            title={isCatalog ? "Não disponível em Catálogo" : "Texto inserido pela IA na cena."}
                        >
                            Texto Integrado
                        </button>
                        <button onClick={() => handleChange('marketingDirection', 'Espaço reservado')} className={`py-2 px-3 rounded-lg border text-[10px] font-black uppercase transition-all ${formData.marketingDirection === 'Espaço reservado' ? 'bg-amber-900/20 border-[#FCB82E] text-[#FCB82E]' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`} title="IA reserva espaço para textos de design.">Espaço Reservado</button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase block" title="Visão do produto (Frente, Lado ou de Cima)">Ângulo: {formData.angle === '3/4' ? 'De lado (3/4)' : formData.angle}</label>
                        <select value={formData.angle} onChange={e => handleChange('angle', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-[10px] text-zinc-300 outline-none">
                            {Object.values(CameraAngle).map(v => <option key={v} value={v}>{v === '3/4' ? 'De lado (3/4)' : v}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase block" title="Tipo de sombra projetada no chão/superfície">Sombra</label>
                        <select value={formData.shadow} onChange={e => handleChange('shadow', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-[10px] text-zinc-300 outline-none">
                            {Object.values(ShadowType).map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                    </div>
                </div>

                {isAdvanced && isCatalog && (
                    <div className="space-y-2">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase">Fundo do Catálogo</label>
                        <div className="grid grid-cols-3 gap-1.5">
                            {['Branco Puro', 'Estúdio', 'Dia de Sol', 'Escuro'].map((bg) => (
                                <button key={bg} onClick={() => handleChange('catalogBackground', bg)} className={`p-1.5 rounded text-[9px] font-bold uppercase border transition-all ${formData.catalogBackground === bg ? 'bg-blue-900/20 border-blue-500 text-blue-400' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}>
                                    {bg}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {isSocial && isAdvanced && (
                   <div className="space-y-3 pt-4 border-t border-zinc-800">
                      <div className="flex justify-between items-center">
                          <label className="text-[9px] font-bold text-zinc-500 uppercase">Cena / Ambientação</label>
                          <button onClick={() => setShowAllAmbiences(!showAllAmbiences)} className="text-[9px] font-bold text-amber-500">Ver Todas</button>
                      </div>
                      <div className="space-y-2">
                          {(showAllAmbiences ? allAmbiences : topAmbiences).map((amb) => (
                              <button key={amb.id} onClick={() => handleChange('selectedAmbienceId', amb.id)} className={`w-full p-2.5 rounded-lg border text-left transition-all ${formData.selectedAmbienceId === amb.id ? 'bg-emerald-950/20 border-emerald-500 ring-1 ring-emerald-500/20' : 'bg-zinc-950 border-zinc-800'}`}>
                                  <div className={`text-[10px] font-black uppercase ${formData.selectedAmbienceId === amb.id ? 'text-emerald-400' : 'text-zinc-300'}`}>{amb.title}</div>
                                  <p className="text-[8px] text-zinc-500 truncate">{amb.description}</p>
                              </button>
                          ))}
                      </div>
                   </div>
                )}

                {isAdvanced && (
                   <div className="space-y-2 bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase">Acessórios (Props)</label>
                      <div className="flex gap-2">
                          <input type="text" value={newPropInput} onChange={(e) => setNewPropInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addProp()} placeholder="Ex: Alecrim, Gelo..." className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-[10px] text-white outline-none focus:border-amber-500" />
                          <button onClick={addProp} className="p-1.5 bg-zinc-800 text-white rounded"><Plus className="w-3 h-3" /></button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                          {formData.props.map(prop => (
                              <span key={prop} className="bg-zinc-800 px-2 py-0.5 rounded text-[8px] text-zinc-300 flex items-center gap-1">
                                  {prop} <X className="w-2.5 h-2.5 cursor-pointer" onClick={() => removeProp(prop)} />
                              </span>
                          ))}
                      </div>
                   </div>
                )}
              </div>
          </div>
        )}
      </div>

      {/* Footer com Navegação e Gerar */}
      <div className="p-4 bg-zinc-950 border-t border-zinc-800 space-y-3">
          <div className="flex gap-3">
              {step > 1 && (
                  <button onClick={prevStep} className="flex-1 py-3 bg-zinc-900 text-zinc-400 rounded-xl font-bold text-[10px] uppercase border border-zinc-800 hover:bg-zinc-800 flex items-center justify-center gap-2">
                      <ChevronLeft className="w-3 h-3" /> Voltar
                  </button>
              )}
              {step < 3 ? (
                  <button 
                    onClick={nextStep} 
                    disabled={step === 1 && !canAdvanceStep1}
                    className="flex-[2] py-3 bg-amber-600 text-white rounded-xl font-bold text-[10px] uppercase hover:bg-amber-500 flex items-center justify-center gap-2 disabled:opacity-30"
                  >
                      Continuar <ChevronRight className="w-3 h-3" />
                  </button>
              ) : (
                  <div className="flex-[2] space-y-2">
                      <div className="bg-zinc-900/50 p-2 rounded-lg border border-zinc-800 text-center">
                          <p className="text-[9px] text-zinc-500 font-bold uppercase">Resumo da Geração</p>
                          <p className="text-[10px] text-zinc-300">
                             2 variações em <b>{formData.defaultAspectRatio}</b>, estilo <b>{formData.objective}</b>, 
                             com <b>{formData.referenceImages.length}</b> ref.
                          </p>
                      </div>
                      <div className="flex gap-2">
                          <button 
                            onClick={handleLocalPreview}
                            className="flex-1 py-3 bg-zinc-800 text-zinc-400 rounded-xl font-bold text-[10px] uppercase border border-zinc-700 hover:bg-zinc-700 flex items-center justify-center gap-2 transition-all"
                            title="Ver o prompt técnico e resumo antes de gerar."
                          >
                            <Eye className="w-4 h-4" /> Preview
                          </button>
                          <button 
                            onClick={onGenerate} 
                            disabled={isGenerating || !canGenerate} 
                            className={`flex-[2] py-3 text-black rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all ${!canGenerate ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-[#FCB82E] hover:bg-[#e5a72a]'}`}
                          >
                            {isGenerating ? <Loader2 className="animate-spin h-4 w-4" /> : <Sparkles className="w-4 h-4" />} 
                            {isGenerating ? "Na Fila..." : "Gerar Agora"}
                          </button>
                      </div>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};