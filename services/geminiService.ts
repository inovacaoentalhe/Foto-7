
import { GoogleGenAI, Type } from "@google/genai";
import { FormData, GeneratedPrompt, ReferenceImage, AspectRatio, AppMode, CameraAngle, ShadowType } from "../types";
import { MANDATORY_STRINGS, TECHNICAL_PROFILES } from "../constants";

const getAiClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("API Key not found.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const executeWithRetry = async <T>(operation: () => Promise<T>, retries = 3, delay = 2000): Promise<T> => {
  try {
    return await operation();
  } catch (error: any) {
    const isQuotaError = error.message?.includes("429") || error.status === "RESOURCE_EXHAUSTED" || error.code === 429;
    if (isQuotaError && retries > 0) {
      await new Promise(res => setTimeout(res, delay));
      return executeWithRetry(operation, retries - 1, delay * 2);
    }
    throw error;
  }
};

/**
 * Analisa a imagem do produto para fornecer um resumo descritivo.
 */
export const analyzeProductImage = async (dataUrl: string, mimeType: string): Promise<string> => {
  return executeWithRetry(async () => {
    const ai = getAiClient();
    const base64Data = dataUrl.split(',')[1];
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            { inlineData: { data: base64Data, mimeType } },
            { text: "Analise esta imagem e descreva o produto principal em uma frase curta de no máximo 10 palavras. Foque em: tipo de objeto, cor principal e material visível. Responda apenas a descrição em português (ex: 'Tênis esportivo azul de tecido')." }
          ]
        }
      ]
    });
    return response.text?.trim() || "Produto detectado";
  });
};

/**
 * Detecta o material e retorna descritores técnicos específicos.
 */
export const getMaterialDescriptors = (material: string, name: string): string => {
  const text = `${material} ${name}`.toLowerCase();
  let descriptors = "";

  if (text.includes("madeira") || text.includes("wood")) descriptors += TECHNICAL_PROFILES.MATERIALS.wood;
  else if (text.includes("metal") || text.includes("aço") || text.includes("ferro")) descriptors += TECHNICAL_PROFILES.MATERIALS.metal;
  else if (text.includes("vidro") || text.includes("glass") || text.includes("cristal")) descriptors += TECHNICAL_PROFILES.MATERIALS.glass;
  else if (text.includes("plástico") || text.includes("plastic") || text.includes("acrílico")) descriptors += TECHNICAL_PROFILES.MATERIALS.plastic;
  else if (text.includes("couro") || text.includes("leather")) descriptors += TECHNICAL_PROFILES.MATERIALS.leather;
  else if (text.includes("cerâmica") || text.includes("ceramic") || text.includes("porcelana")) descriptors += TECHNICAL_PROFILES.MATERIALS.ceramic;
  
  return descriptors ? ` Material Properties: ${descriptors}` : "";
};

/**
 * Monta o prompt final em camadas (Lógica Local).
 */
export const assembleFinalPrompt = (subjectText: string, materialDescriptors: string, settings: any) => {
  const isCatalog = settings.objective === AppMode.CATALOG;
  const cameraProfile = TECHNICAL_PROFILES.CAMERA[settings.angle as CameraAngle] || TECHNICAL_PROFILES.CAMERA[CameraAngle.THREE_QUARTERS];
  const lightingProfile = TECHNICAL_PROFILES.LIGHTING[settings.shadow as ShadowType] || TECHNICAL_PROFILES.LIGHTING[ShadowType.SOFT];
  const backgroundProfile = isCatalog 
    ? `Background: Solid clean ${settings.catalogBackground || "studio white"}, no scenery, infinite horizon.` 
    : `Background: ${settings.background || "Realistic high-end environment"}, seamless integration.`;

  const customizationOverride = settings.customPersonalization 
    ? `\n[OVERRIDE PERSONALIZATION]: APPLY THE FOLLOWING CHANGE TO THE REFERENCE IMAGE: ${settings.customPersonalization}. Ensure high-fidelity text/logo rendering.` 
    : "";

  return `
    [SUBJECT]: ${subjectText}. ${materialDescriptors}
    
    [CAMERA SETUP]: ${cameraProfile}
    
    [LIGHTING SETUP]: ${lightingProfile} High-end commercial studio lighting, global illumination, ray-traced reflections.
    
    [ENVIRONMENT]: ${backgroundProfile}
    
    [QUALITY/RENDER]: Ultra-realistic, 8k resolution, highly detailed textures, sharp focus, professional color grading, commercial product photo quality.
    
    ${customizationOverride}
    ${MANDATORY_STRINGS.FIDELITY_RULES}
    ${isCatalog ? MANDATORY_STRINGS.CATALOG : MANDATORY_STRINGS.SOCIAL}
    ${(settings.customPersonalization) ? "" : MANDATORY_STRINGS.NO_TEXT_ENFORCEMENT}
  `.replace(/\s+/g, " ").trim();
};

export const correctPortuguese = async (text: string): Promise<string> => {
  if (!text.trim() || text.length < 5) return text;
  return executeWithRetry(async () => {
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Corrija estritamente a gramática PT-BR deste briefing técnico, mantendo a estrutura de tópicos: "${text}"`,
        config: { systemInstruction: "Você é um revisor de prompts de estúdio fotográfico." }
      });
      return response.text?.trim() || text;
  });
};

export const suggestFieldsFromBriefing = async (formData: FormData): Promise<Partial<FormData>> => {
  return executeWithRetry(async () => {
    const ai = getAiClient();
    const briefingText = formData.finalBriefPt || formData.userBrief || "Produto genérico";
    const prompt = `Analise: "${briefingText}". Sugira JSON: objective (Catálogo ou Post Social), angle, shadow, background, tone.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            objective: { type: Type.STRING },
            angle: { type: Type.STRING },
            shadow: { type: Type.STRING },
            background: { type: Type.STRING },
            tone: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(response.text || "{}");
  });
};

export const generateCreativePrompts = async (formData: FormData): Promise<GeneratedPrompt[]> => {
  return executeWithRetry(async () => {
      const ai = getAiClient();
      
      const systemInstruction = `Você é um Engenheiro de Prompts Sênior especializado em fotografia de produto.
      ESTRUTURA OBRIGATÓRIA DO PROMPT (PT-BR):
      ■ PRODUTO: [Descrição do item, material e texturas]
      ■ CENÁRIO: [Ambiente, superfície e atmosfera]
      ■ PERSONALIZAÇÃO: [Detalhes de gravação, logo ou texto específico solicitado]
      ■ PROPS: [Elementos de apoio na cena]
      ■ ESTILO: [Ângulo de câmera e iluminação de estúdio]

      REGRAS:
      - Foque em realismo fotográfico 8k.
      - Não repita informações.
      - Mantenha os tópicos separados.`;

      const parts: any[] = [{ 
        text: `Gere 2 variações criativas seguindo a ESTRUTURA acima. 
        Produto: ${formData.productName}. 
        Material: ${formData.material}.
        Cenário desejado: ${formData.userBrief || "Estúdio profissional"}.
        Personalização solicitada: ${formData.customPersonalization || "Manter original da referência"}.` 
      }];
      
      const heroImage = formData.referenceImages.find(img => img.isHero);
      if (heroImage) {
          parts.push({ inlineData: { mimeType: heroImage.mimeType, data: heroImage.dataUrl.split(',')[1] } });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: { parts },
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                layout: { type: Type.STRING },
                promptPt: { type: Type.STRING },
                negativePt: { type: Type.STRING },
                highlights: { type: Type.STRING }
              }
            }
          }
        },
      });

      return JSON.parse(response.text || "[]");
  });
};

export const prepareTechnicalPrompt = async (
  promptPt: string,
  negativePt: string,
  settings: any,
  referenceImages: ReferenceImage[]
) => {
  const ai = getAiClient();
  
  // Tradução Estruturada: Traduz cada tópico mantendo a divisão técnica
  const translation = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Translate this product photography prompt to professional technical English, maintaining the format with bullet points (■): "${promptPt}"`
  });
  const promptEnTranslated = translation.text || promptPt;

  const materialDescriptors = getMaterialDescriptors(settings.material || "", settings.productName || "");
  const finalPromptEn = assembleFinalPrompt(promptEnTranslated, materialDescriptors, settings);

  return {
    promptEn: promptEnTranslated,
    negativeEn: `${MANDATORY_STRINGS.NEGATIVE_SUFFIX}, ${negativePt}`,
    finalPromptEn: finalPromptEn
  };
};

export const generateImageFromPrompt = async (
  finalPromptEn: string,
  referenceImages: ReferenceImage[],
  aspectRatio: AspectRatio
): Promise<string> => {
  return executeWithRetry(async () => {
      const ai = getAiClient();
      const parts: any[] = [{ text: finalPromptEn }];
      
      const hero = referenceImages.find(img => img.isHero);
      if (hero) {
          parts.push({ 
            inlineData: { 
              data: hero.dataUrl.split(',')[1], 
              mimeType: hero.mimeType 
            } 
          });
      }
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: { 
            imageConfig: { aspectRatio: aspectRatio as any } 
        },
      });

      const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
      if (!imagePart?.inlineData) throw new Error("Geração de imagem falhou.");
      
      return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
  });
};

export const generateStructuredBrief = async (formData: FormData): Promise<any> => {
  return executeWithRetry(async () => {
    const ai = getAiClient();
    const prompt = `Gere brief_pt e copy_pt (title, subtitle, offer) para ${formData.productName}. Material: ${formData.material}. JSON format.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            brief_pt: { type: Type.STRING },
            copy_pt: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                subtitle: { type: Type.STRING },
                offer: { type: Type.STRING }
              }
            }
          }
        }
      }
    });
    return JSON.parse(response.text || "{}");
  });
};
