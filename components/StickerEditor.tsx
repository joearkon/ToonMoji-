import React, { useState, useEffect } from 'react';
import { X, Play, Download, Loader2, Sparkles, Wand2, Zap } from 'lucide-react';
import { ProcessedSticker, AnimationEffect, Language } from '../types';
import { createStickerGif, convertVideoToGif } from '../services/imageProcessor';
import { generateStickerAnimation } from '../services/geminiService';
import { Button } from './Button';

interface StickerEditorProps {
  sticker: ProcessedSticker;
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  emotionLabel: string;
  styleLabel: string;
}

const EFFECTS: { id: AnimationEffect; label: { en: string; zh: string } }[] = [
  { id: 'none', label: { en: 'Static', zh: '静态' } },
  { id: 'shake', label: { en: 'Shake', zh: '摇头' } },
  { id: 'bounce', label: { en: 'Bounce', zh: '弹跳' } },
  { id: 'pulse', label: { en: 'Pulse', zh: '脉冲' } },
  { id: 'wobble', label: { en: 'Wobble', zh: '摇摆' } },
  { id: 'spin', label: { en: 'Spin', zh: '旋转' } },
];

export const StickerEditor: React.FC<StickerEditorProps> = ({ 
  sticker, 
  isOpen, 
  onClose, 
  lang,
  emotionLabel,
  styleLabel
}) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'ai'>('basic');
  const [selectedEffect, setSelectedEffect] = useState<AnimationEffect>('none');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Basic Logic
  const [isProcessingBasic, setIsProcessingBasic] = useState(false);
  
  // AI Logic
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiGifUrl, setAiGifUrl] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedEffect('none');
      setPreviewUrl(sticker.src);
      setActiveTab('basic');
      setAiGifUrl(null);
      setAiError(null);
    }
  }, [isOpen, sticker]);

  // Handle Basic Effects
  useEffect(() => {
    if (activeTab === 'ai') return;
    
    let active = true;
    const generate = async () => {
      setIsProcessingBasic(true);
      await new Promise(r => setTimeout(r, 50));
      
      try {
        const blob = await createStickerGif(sticker.src, selectedEffect);
        if (active) {
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (active) setIsProcessingBasic(false);
      }
    };

    generate();
    return () => { active = false; };
  }, [selectedEffect, sticker, activeTab]);

  const handleAiGenerate = async () => {
    if (isGeneratingAI || aiGifUrl) return;
    
    setIsGeneratingAI(true);
    setAiError(null);
    try {
      // 1. Generate Video
      const videoUrl = await generateStickerAnimation(sticker.src, emotionLabel, styleLabel);
      
      // 2. Convert to GIF client side
      const gifBlob = await convertVideoToGif(videoUrl);
      const gifUrl = URL.createObjectURL(gifBlob);
      
      setAiGifUrl(gifUrl);
      setPreviewUrl(gifUrl); // Show AI result
    } catch (e: any) {
      console.error(e);
      setAiError(e.message || "Failed to generate animation");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleDownload = async () => {
    const urlToDownload = activeTab === 'ai' ? aiGifUrl : previewUrl;
    if (!urlToDownload) return;
    
    const link = document.createElement('a');
    link.href = urlToDownload;
    const ext = (activeTab === 'basic' && selectedEffect === 'none') ? 'png' : 'gif';
    link.download = `toonmoji_${emotionLabel}_${Date.now()}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Play size={18} className="text-indigo-400" />
            {lang === 'en' ? 'Sticker Motion Studio' : '表情动效工作室'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800">
          <button
            onClick={() => { setActiveTab('basic'); setPreviewUrl(sticker.src); setSelectedEffect('none'); }}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors
              ${activeTab === 'basic' ? 'text-indigo-400 bg-slate-800/50 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200'}
            `}
          >
            <Zap size={16} />
            {lang === 'en' ? 'Basic Effects' : '基础特效'}
          </button>
          <button
            onClick={() => { setActiveTab('ai'); if(aiGifUrl) setPreviewUrl(aiGifUrl); }}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors
              ${activeTab === 'ai' ? 'text-indigo-400 bg-slate-800/50 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200'}
            `}
          >
            <Sparkles size={16} />
            {lang === 'en' ? 'AI Generation' : 'AI 生成 (Beta)'}
          </button>
        </div>

        {/* Preview Area */}
        <div className="p-8 flex items-center justify-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-slate-800/50 relative">
          <div className="relative w-[240px] h-[240px] flex items-center justify-center">
            {(isProcessingBasic || isGeneratingAI) && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/70 rounded-lg backdrop-blur-sm p-4 text-center">
                <Loader2 className="animate-spin text-indigo-400 mb-2" size={40} />
                {isGeneratingAI && (
                  <p className="text-xs text-indigo-200">
                    {lang === 'en' ? 'Creating video & converting to GIF...' : '正在生成视频并转为 GIF...'}
                    <br/>
                    <span className="opacity-70">(~20s)</span>
                  </p>
                )}
              </div>
            )}
            
            {previewUrl ? (
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="w-[240px] h-[240px] object-contain drop-shadow-2xl" 
              />
            ) : (
              <img 
                src={sticker.src} 
                alt="Original" 
                className="w-[240px] h-[240px] object-contain opacity-50 grayscale" 
              />
            )}
          </div>
          
          {/* Emotion Label Badge */}
          <div className="absolute top-4 left-4 bg-slate-900/80 px-3 py-1 rounded-full text-xs font-medium text-white border border-slate-700">
            {emotionLabel}
          </div>
        </div>

        {/* Controls */}
        <div className="p-6 bg-slate-900 space-y-6 flex-1 overflow-y-auto">
          
          {activeTab === 'basic' ? (
            <div>
              <label className="text-sm font-medium text-slate-400 mb-3 block">
                {lang === 'en' ? 'Choose Animation Effect' : '选择动画效果'}
              </label>
              <div className="grid grid-cols-3 gap-3">
                {EFFECTS.map((effect) => (
                  <button
                    key={effect.id}
                    onClick={() => setSelectedEffect(effect.id)}
                    className={`
                      py-2 px-3 rounded-lg text-sm font-medium transition-all border
                      ${selectedEffect === effect.id 
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/50' 
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-slate-600'}
                    `}
                  >
                    {effect.label[lang]}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-indigo-900/20 p-4 rounded-lg border border-indigo-500/20">
                <h4 className="text-sm font-bold text-indigo-300 mb-1 flex items-center gap-2">
                   <Wand2 size={14} /> 
                   {lang === 'en' ? 'Generative Motion' : '生成式动效'}
                </h4>
                <p className="text-xs text-indigo-200/70 leading-relaxed">
                  {lang === 'en' 
                    ? `Uses Gemini Veo to generate a unique animation based on the "${emotionLabel}" emotion. This takes about 30 seconds.` 
                    : `使用 Gemini Veo 根据“${emotionLabel}”表情生成独特的动画。这大约需要 30 秒。`}
                </p>
              </div>

              {!aiGifUrl && !isGeneratingAI && (
                 <Button fullWidth onClick={handleAiGenerate} className="bg-gradient-to-r from-indigo-600 to-purple-600">
                   <Sparkles size={16} /> 
                   {lang === 'en' ? 'Generate AI Animation' : '生成 AI 动画'}
                 </Button>
              )}

              {aiError && (
                <div className="text-red-400 text-xs bg-red-900/20 p-3 rounded border border-red-900/50">
                  Error: {aiError}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-slate-800">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              {lang === 'en' ? 'Close' : '关闭'}
            </Button>
            <Button 
              onClick={handleDownload} 
              className="flex-[2]" 
              disabled={isProcessingBasic || isGeneratingAI || (activeTab === 'ai' && !aiGifUrl)}
            >
              <Download size={18} />
              {lang === 'en' ? 'Download GIF' : '下载 GIF'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};