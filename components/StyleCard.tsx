import React from 'react';
import { StyleOption, Language } from '../types';
import { Palette } from 'lucide-react';

interface StyleCardProps {
  style: StyleOption;
  isSelected: boolean;
  onSelect: (style: StyleOption) => void;
  lang: Language;
}

export const StyleCard: React.FC<StyleCardProps> = ({ style, isSelected, onSelect, lang }) => {
  return (
    <div 
      onClick={() => onSelect(style)}
      className={`
        relative overflow-hidden rounded-xl cursor-pointer transition-all duration-300 border-2 flex flex-col
        ${isSelected 
          ? 'border-indigo-500 scale-[1.02] shadow-[0_0_20px_rgba(99,102,241,0.3)] bg-gray-800' 
          : 'border-gray-700 hover:border-gray-500 bg-gray-800/50 hover:bg-gray-800'}
      `}
      style={{ minHeight: '160px' }} 
    >
      {/* Top Graphic Area */}
      <div className={`h-20 w-full bg-gradient-to-br ${style.previewColor} opacity-30 flex items-center justify-center shrink-0`}>
         <Palette size={28} className="text-white opacity-70" />
      </div>
      
      {/* Content Area - Ensured visibility */}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-bold text-white text-md mb-2 leading-tight">
          {style.label[lang]}
        </h3>
        <p className="text-xs text-gray-400 leading-relaxed overflow-hidden">
          {style.description[lang]}
        </p>
      </div>

      {/* Selected Checkmark */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center shadow-md">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </div>
  );
};