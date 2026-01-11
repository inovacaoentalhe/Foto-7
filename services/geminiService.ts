
import { GoogleGenAI, Type } from "@google/genai";
import { FormData, GeneratedPrompt, ReferenceImage, AspectRatio, AppMode } from "../types";
import { MANDATORY_STRINGS } from "../constants";

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
      
      const systemInstruction = `Você é um Engenheiro de Prompts Sênior.
      ESTRUTURA OBRIGATÓRIA DO PROMPT (PT-BR):
      ■ PRODUTO: [Descrição do item e material]
      ■ CENÁRIO: [Ambientação e luz]
      ■ PERSONALIZAÇÃO: [Texto/Logo/Nomes específicos a serem alterados]
      ■ PROPS: [Acessórios de cena]
      ■ ESTILO: [Ângulo e fotografia]

      REGRAS:
      - Se o usuário pedir para trocar um nome (ex: "Edivaldo por Sergio"), coloque isso claramente em PERSONALIZAÇÃO.
      - Mantenha os tópicos separados e limpos.
      - Não repita informações entre os tópicos.`;

      const parts: any[] = [{ 
        text: `Gere 2 variações criativas seguindo a ESTRUTURA acima. 
        Produto: ${formData.productName}. 
        Material: ${formData.material}.
        Cenário desejado: ${formData.userBrief || "Estúdio profissional"}.
        Personalização solicitada: ${formData.customPersonalization || "Manter original"}.` 
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
  const isCatalog = settings.objective === AppMode.CATALOG;

  // Tradução Estruturada: Traduz cada tópico mantendo a divisão
  const translation = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Translate this structured prompt to technical English, maintaining the format with bullet points (■): "${promptPt}"`
  });
  const promptEnTranslated = translation.text || promptPt;

  // Bloco de Comando Mestre (Sobreposição de Personalização)
  const customizationOverride = settings.customPersonalization 
    ? `\n[OVERRIDE PERSONALIZATION]: APPLY THE FOLLOWING CHANGE TO THE REFERENCE IMAGE: ${settings.customPersonalization}. Ensure text accuracy.` 
    : "";

  let finalPromptEn = `
    PHOTOGRAPHIC STUDIO RENDER, 8K, HIGH FIDELITY.
    
    ${promptEnTranslated}
    
    [TECHNICAL SETUP]:
    - Mode: ${isCatalog ? MANDATORY_STRINGS.CATALOG : MANDATORY_STRINGS.SOCIAL}
    - Angle: ${settings.angle}
    - Shadow: ${settings.shadow}
    - Background: ${isCatalog ? (settings.catalogBackground || "Pure white studio") : "Realistic context"}
    - Quality: Razor sharp, realistic textures, macro detail.

    ${customizationOverride}
    ${MANDATORY_STRINGS.FIDELITY_RULES}
    ${(settings.customPersonalization) ? "" : MANDATORY_STRINGS.NO_TEXT_ENFORCEMENT}
  `.replace(/\s+/g, " ").trim();

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
      if (!imagePart?.inlineData) throw new Error("Geração falhou.");
      
      return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
  });
};

export const generateStructuredBrief = async (formData: FormData): Promise<any> => {
  return executeWithRetry(async () => {
    const ai = getAiClient();
    const prompt = `Gere brief_pt e copy_pt (title, subtitle, offer) para ${formData.productName}. JSON format.`;
    
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
