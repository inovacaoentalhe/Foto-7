
import { AppMode, ArtStyle, BackgroundType, CameraAngle, MarketingTone, ShadowType, AspectRatio, RotationDegree, TextPresence, FormData, Preset } from './types';

export const BRAND_COLOR = "#FCB82E";

export const PROPS_OPTIONS = [
  "Sal grosso",
  "Ervas frescas",
  "Fumaça leve",
  "Tecido de linho",
  "Madeira rústica",
  "Luz natural"
];

export const TECHNICAL_PROFILES = {
  CAMERA: {
    [CameraAngle.FRONT]: "Eye-level shot, 85mm lens, f/8 aperture, straight-on perspective, sharp focus on product details.",
    [CameraAngle.THREE_QUARTERS]: "Three-quarter view, 50mm lens, f/11 aperture, professional product placement, deep depth of field.",
    [CameraAngle.TOP]: "Top-down overhead shot, 35mm flat lay lens, f/8, symmetrical composition, zero distortion."
  },
  LIGHTING: {
    [ShadowType.CONTACT]: "Strong key light from 45 degrees, subtle fill light, sharp contact shadow, high contrast studio lighting.",
    [ShadowType.SOFT]: "Large softbox overhead, wrap-around lighting, gentle rim light, ray-traced soft shadows, global illumination.",
    [ShadowType.MEDIUM]: "Classic three-point lighting setup, softbox key, umbrella fill, hair light for rim definition, realistic specular highlights.",
    [ShadowType.STRONG]: "Hard direct light source, high-contrast shadows, dramatic chiaroscuro effect, clean highlights.",
    [ShadowType.NONE]: "Flat lighting, high-key studio environment, shadowless render, even illumination across all surfaces."
  },
  MATERIALS: {
    wood: "Natural wood grain texture, realistic pores, satin finish, warm organic feel.",
    metal: "Brushed metal surface, anisotropic specular highlights, realistic reflections, cold industrial texture.",
    glass: "Physically accurate refraction, clear transparency, caustic light effects, realistic specular glints.",
    plastic: "Subtle micro-scratches, realistic roughness map, matte finish, authentic material density.",
    leather: "Detailed hide texture, organic grain, soft specular sheen, realistic stitching details.",
    ceramic: "Smooth glazed finish, soft clay reflections, clean porcelain texture, subsurface scattering."
  }
};

export const BASE_BRIEF_TEXT = `[REGRAS VISUAIS FIXAS - INOVAÇÃO ENTALHE]:
1. Fotografia profissional de estúdio, alta resolução (8k), texturas realistas.
2. Iluminação controlada para valorizar o relevo e o material do produto.
3. Sem distorções de lente.
4. Cores e entalhes fiéis ao material original.
5. Limpeza visual absoluta em modo catálogo.`;

export const INITIAL_FORM_STATE: FormData = {
  productName: "",
  material: "",
  
  baseBrief: BASE_BRIEF_TEXT,
  userBrief: "",
  finalBriefPt: "",
  briefingStatus: 'vazio',
  
  objective: AppMode.CATALOG,
  style: ArtStyle.MINIMALIST,
  marketingDirection: 'Espaço reservado',
  tone: MarketingTone.SALES,
  textPresence: TextPresence.MEDIUM,
  angle: CameraAngle.THREE_QUARTERS,
  shadow: ShadowType.SOFT,
  background: BackgroundType.WHITE,
  props: [],
  customProps: "",
  
  socialCopyTitle: "",
  socialCopySubtitle: "",
  socialCopyOffer: "",
  suggestedAmbiences: [],
  customAmbiences: [],

  referenceImages: [],
  useRefImages: false,
  lockProduct: true,
  prioritizeFidelity: true,
  imageNotes: "",

  personalizationVariations: "",
  activeVariation: "",
  customPersonalization: "",

  defaultAspectRatio: '1:1',
  defaultRotation: 0,

  uiMode: 'simple',
  wizardStep: 1
};

export const MANDATORY_STRINGS = {
  CATALOG: "PRO CATALOG SHOT. Clean solid background. Pure studio environment. Focus on geometry and texture. Professional commercial photography.",
  SOCIAL: "High-end lifestyle commercial marketing. Premium realistic environment. Cinematic lighting. Contextualized composition.",
  
  NEGATIVE_SUFFIX: "text, typography, letters, numbers, symbols, writing, watermark, logo, signature, blurry, distorted, low quality, warped, extra parts, unreadable, artistic blur, vignette, dark corners, altered product shape, changed logo, missing engraving, wrong proportions, morphing, words, alphabets, messy background, cluttered scene.",
  
  FIDELITY_RULES: "CRITICAL: The attached HERO image is the ABSOLUTE reference. Maintain exact silhouette, proportions, and product identity. Do not change engravings or textures. Zero deformation.",
  
  NO_TEXT_ENFORCEMENT: "DO NOT RENDER ANY TEXT OR LOGOS OTHER THAN WHAT IS IN THE REFERENCE. Clean image only."
};

export const ASPECT_RATIO_TECHNICAL_TEXTS: Record<AspectRatio, string> = {
  '1:1': "Square aspect ratio (1:1), centered composition.",
  '3:4': "Vertical aspect ratio (3:4).",
  '4:5': "Vertical aspect ratio (4:5).",
  '9:16': "Tall vertical aspect ratio (9:16).",
  '16:9': "Widescreen aspect ratio (16:9)."
};

export const ASPECT_RATIOS: AspectRatio[] = ['1:1', '3:4', '4:5', '9:16', '16:9'];
export const ROTATION_OPTIONS: RotationDegree[] = [0, 90, 180, 270];
export const REFERENCE_USAGE_TYPES = ['Contorno', 'Medidas', 'Personalização', 'Formato'];

export const SYSTEM_PRESETS: Preset[] = [
  {
    id: 'sys_catalogo_ml',
    name: 'Catálogo — Mercado Livre (Branco)',
    description: 'Fundo branco puro, iluminação técnica softbox, foco total, nitidez 8k.',
    isSystem: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    mode: AppMode.CATALOG,
    style: ArtStyle.MINIMALIST,
    marketingDirection: 'Espaço reservado',
    copyTone: MarketingTone.SALES,
    aspectRatio: '1:1',
    angle: CameraAngle.THREE_QUARTERS,
    shadow: ShadowType.SOFT,
    background: BackgroundType.WHITE,
    propsEnabled: false,
    propsList: [],
    propsPolicy: 'restrito',
    useReferenceImages: true,
    lockProductFidelity: true,
    defaultRotation: 0,
    showNegativePrompts: true
  },
  {
    id: 'sys_social_scene',
    name: 'Post Social — Premium Lifestyle',
    description: 'Ambientação realista, iluminação cinematográfica, carnes e ervas.',
    isSystem: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    mode: AppMode.SOCIAL,
    style: ArtStyle.SCENE,
    marketingDirection: 'Espaço reservado',
    copyTone: MarketingTone.CREATIVE,
    aspectRatio: '3:4',
    angle: CameraAngle.THREE_QUARTERS,
    shadow: ShadowType.MEDIUM,
    background: BackgroundType.SCENE_CONTEXT,
    propsEnabled: true,
    propsList: ["Carne fatiada", "Sal grosso", "Ervas"],
    propsPolicy: 'livre',
    useReferenceImages: true,
    lockProductFidelity: true,
    defaultRotation: 0,
    showNegativePrompts: true
  }
];
