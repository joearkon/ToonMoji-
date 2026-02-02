import React from 'react';
import { AppStep, Language, ThemeConfig } from '../types';
import { UI_TEXT } from '../constants';
import { Check } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: AppStep;
  lang: Language;
  theme: ThemeConfig;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, lang, theme }) => {
  const steps = [
    { id: AppStep.UPLOAD, label: UI_TEXT.stepUpload[lang] },
    { id: AppStep.STYLE, label: UI_TEXT.stepStyle[lang] },
    { id: AppStep.CONFIG, label: UI_TEXT.stepConfig[lang] },
    { id: AppStep.RESULT, label: UI_TEXT.stepResult[lang] },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto mb-8">
      <div className="relative flex justify-between">
        {/* Connector Line */}
        <div className={`absolute top-1/2 left-0 w-full h-0.5 -z-10 transform -translate-y-1/2 rounded ${theme.colors.border.replace('border-', 'bg-')}`}></div>
        
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const isGenerating = currentStep === AppStep.GENERATING && step.id === AppStep.RESULT;

          return (
            <div key={step.id} className="flex flex-col items-center group">
              <div 
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300
                  ${isCompleted || isGenerating 
                    ? `${theme.colors.accent} ${theme.colors.accentText} border-transparent` 
                    : isCurrent 
                      ? `${theme.colors.bg} ${theme.colors.ring.replace('ring', 'border')} ${theme.colors.text} shadow-[0_0_10px_rgba(0,0,0,0.1)]` 
                      : `${theme.colors.bg} ${theme.colors.border} ${theme.colors.textSecondary}`}
                `}
              >
                {isCompleted ? <Check size={16} /> : <span>{index + 1}</span>}
              </div>
              <span className={`
                mt-2 text-xs font-medium transition-colors duration-300
                ${isCurrent || isCompleted || isGenerating ? theme.colors.text : theme.colors.textSecondary}
              `}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};