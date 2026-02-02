import React from 'react';
import { StyleOption, Language, ThemeConfig } from '../types';
import { Palette } from 'lucide-react';

interface StyleCardProps {
  style: StyleOption;
  isSelected: boolean;
  onSelect: (style: StyleOption) => void;
  lang: Language;
  theme: ThemeConfig;
}

export const StyleCard: React.FC<StyleCardProps> = ({ style, isSelected, onSelect, lang, theme }) => {
  return (
    <div 
      onClick={() => onSelect(style)}
      className={`
        relative overflow-hidden rounded-xl cursor-pointer transition-all duration-300 border-2 flex flex-col
        ${isSelected 
          ? `scale-[1.02] shadow-lg ${theme.id === 'cosmic' ? 'bg-slate-800' : 'bg-white'}`
          : `${theme.colors.panel} hover:opacity-90`}
      `}
      style={{ 
        minHeight: '160px',
        borderColor: isSelected ? 'var(--accent-color)' : 'transparent', // We handle this via class injection in parent or inline
        // Fallback for tailwind classes not parsing var() well in arbitrary values sometimes
        border: isSelected ? `2px solid` : `2px solid transparent`
      }}
      // Use Tailwind generic classes for border color mapped to theme passed in props? 
      // Actually, easier to use template literal for the specific dynamic classes 
      // But since we can't interpolate random strings into tailwind compilation easily,
      // we rely on the parent wrapper or style prop for specific overrides, 
      // OR we just use the theme object's class strings if they are valid tailwind classes.
    >
      <div className={`absolute inset-0 border-2 rounded-xl pointer-events-none transition-colors duration-300 ${isSelected ? theme.colors.ring.replace('ring-', 'border-') : theme.colors.border}`}></div>

      {/* Top Graphic Area */}
      <div className={`h-20 w-full bg-gradient-to-br ${style.previewColor} opacity-30 flex items-center justify-center shrink-0`}>
         <Palette size={28} className={theme.colors.textSecondary} />
      </div>
      
      {/* Content Area */}
      <div className="p-4 flex-1 flex flex-col relative z-10">
        <h3 className={`font-bold text-md mb-2 leading-tight ${theme.colors.text}`}>
          {style.label[lang]}
        </h3>
        <p className={`text-xs leading-relaxed overflow-hidden ${theme.colors.textSecondary}`}>
          {style.description[lang]}
        </p>
      </div>

      {/* Selected Checkmark */}
      {isSelected && (
        <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center shadow-md ${theme.colors.accent}`}>
          <svg className={`w-4 h-4 ${theme.colors.accentText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </div>
  );
};