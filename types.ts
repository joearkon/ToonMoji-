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

// Theme Configuration Interface
export interface ThemeConfig {
  id: string;
  name: LocalizedString;
  colors: {
    bg: string;          // Main App Background
    panel: string;       // Card/Section Background
    panelBorder: string; // Card Border
    text: string;        // Primary Text
    textSecondary: string; // Secondary Text (subtitles)
    accent: string;      // Primary Button/Highlight BG
    accentHover: string; // Primary Button Hover
    accentText: string;  // Text on Accent Button
    secondaryBtn: string; // Secondary Button BG
    secondaryBtnText: string;
    border: string;      // Generic borders (inputs, separators)
    inputBg: string;     // Input field background
    ring: string;        // Focus rings
    blob1: string;       // Decorative background blob color
    blob2: string;       // Decorative background blob color
    success: string;     // Success state color
  };
}