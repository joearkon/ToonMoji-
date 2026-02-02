export type Language = 'en' | 'zh';

export interface LocalizedString {
  en: string;
  zh: string;
}

export interface StyleOption {
  id: string;
  label: LocalizedString;
  description: LocalizedString;
  promptModifier: string; // Internal prompt always in English
  previewColor: string;
}

export interface EmotionOption {
  id: string;
  label: LocalizedString;
}

export interface GenerationConfig {
  styleId: string;
  expressionCount: 3 | 6 | 9;
  selectedEmotions: string[];
  customEmotion: string;
}

export interface GeneratedImage {
  url: string;
  timestamp: number;
}

export interface ProcessedSticker {
  id: string;
  src: string; // Base64 PNG (240x240, Transparent)
}

export type AnimationEffect = 'none' | 'shake' | 'bounce' | 'pulse' | 'spin' | 'wobble';

export enum AppStep {
  UPLOAD = 0,
  STYLE = 1,
  CONFIG = 2,
  GENERATING = 3,
  RESULT = 4,
}