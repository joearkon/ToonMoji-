import React, { useState, useRef, useEffect } from 'react';
import { Upload, ArrowRight, ArrowLeft, Wand2, Download, RefreshCw, Image as ImageIcon, Smile, Settings, Languages, ChevronLeft, ChevronRight, FileArchive, Scissors, Key, X, ExternalLink, Save } from 'lucide-react';
import { AppStep, GenerationConfig, StyleOption, Language, ProcessedSticker } from './types';
import { CARTOON_STYLES, PRESET_EMOTIONS, UI_TEXT } from './constants';
import { generateStickerSheet } from './services/geminiService';
import { extractStickers, createZipFromStickers, processImageForDownload } from './services/imageProcessor';
import { StepIndicator } from './components/StepIndicator';
import { StyleCard } from './components/StyleCard';
import { Button } from './components/Button';
import { StickerEditor } from './components/StickerEditor';

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('zh');
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.UPLOAD);
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [processedStickers, setProcessedStickers] = useState<ProcessedSticker[]>([]);
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingStickers, setIsProcessingStickers] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [isPreparingDownload, setIsPreparingDownload] = useState(false);
  
  // API Key Modal State
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [userApiKey, setUserApiKey] = useState('');

  // Editor State
  const [editingSticker, setEditingSticker] = useState<ProcessedSticker | null>(null);
  const [editingEmotion, setEditingEmotion] = useState<string>(''); // Track which emotion maps to the sticker

  // Style Pagination State
  const [stylePage, setStylePage] = useState(0);
  const ITEMS_PER_PAGE = 4;
  
  // Configuration State
  const [selectedStyle, setSelectedStyle] = useState<StyleOption>(CARTOON_STYLES[0]);
  const [expressionCount, setExpressionCount] = useState<3 | 6 | 9>(6);
  const [selectedEmotionIds, setSelectedEmotionIds] = useState<string[]>(['Happy', 'Cool', 'Surprised']);
  const [customEmotion, setCustomEmotion] = useState('');
  
  // Calculated Prompt List (Stored to map back to stickers later)
  const [generatedPromptEmotions, setGeneratedPromptEmotions] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = UI_TEXT;

  // Load API Key from local storage on mount
  useEffect(() => {
    const stored = localStorage.getItem('gemini_api_key');
    if (stored) setUserApiKey(stored);
  }, []);

  // Auto-process stickers when result is ready
  useEffect(() => {
    if (currentStep === AppStep.RESULT && generatedImage) {
      const process = async () => {
        setIsProcessingStickers(true);
        try {
          const stickers = await extractStickers(generatedImage);
          setProcessedStickers(stickers);
        } catch (e) {
          console.error("Failed to cut stickers", e);
        } finally {
          setIsProcessingStickers(false);
        }
      };
      process();
    } else {
      setProcessedStickers([]);
    }
  }, [currentStep, generatedImage]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError(t.errorFileTooLarge[lang]);
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setSourceImage(event.target.result as string);
          setError(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleEmotion = (emotionId: string) => {
    if (selectedEmotionIds.includes(emotionId)) {
      setSelectedEmotionIds(selectedEmotionIds.filter(e => e !== emotionId));
    } else {
      if (selectedEmotionIds.length >= expressionCount) {
        setSelectedEmotionIds([...selectedEmotionIds.slice(1), emotionId]);
      } else {
        setSelectedEmotionIds([...selectedEmotionIds, emotionId]);
      }
    }
  };

  const handleOpenApiKeySettings = async () => {
    // If running in a specific Google environment with wrapper, try that first
    const win = window as any;
    if (win.aistudio && win.aistudio.openSelectKey) {
       try {
         await win.aistudio.openSelectKey();
         setError(null);
         return;
       } catch (e) {
         console.error(e);
       }
    }
    // Fallback to manual modal
    setShowApiKeyModal(true);
  };

  const handleSaveApiKey = () => {
    if (userApiKey.trim()) {
      localStorage.setItem('gemini_api_key', userApiKey.trim());
      setShowApiKeyModal(false);
      setError(null);
    }
  };

  const handleClearApiKey = () => {
    localStorage.removeItem('gemini_api_key');
    setUserApiKey('');
  };

  const handleGenerate = async () => {
    if (!sourceImage) return;

    // Build the emotion list for the prompt
    let promptEmotions: string[] = [];
    selectedEmotionIds.forEach(id => {
       const emotion = PRESET_EMOTIONS.find(e => e.id === id);
       // Use localized label for prompt logic so that generated text matches the user's language
       if (emotion) promptEmotions.push(emotion.label[lang]);
       else promptEmotions.push(id);
    });

    if (customEmotion.trim()) {
      promptEmotions.push(customEmotion.trim());
    }
    
    // Fill remaining if needed
    while (promptEmotions.length < expressionCount) {
       const random = PRESET_EMOTIONS[Math.floor(Math.random() * PRESET_EMOTIONS.length)];
       const randomLabel = random.label[lang];
       if(!promptEmotions.includes(randomLabel)) promptEmotions.push(randomLabel);
    }
    
    // Trim to count
    promptEmotions = promptEmotions.slice(0, expressionCount);
    
    // Store this list to map to stickers later
    setGeneratedPromptEmotions(promptEmotions);

    setIsLoading(true);
    setCurrentStep(AppStep.GENERATING);
    setError(null);

    try {
      const resultImage = await generateStickerSheet(
        sourceImage,
        selectedStyle,
        expressionCount,
        promptEmotions
      );
      setGeneratedImage(resultImage);
      setCurrentStep(AppStep.RESULT);
    } catch (err: any) {
      setError(err.message || t.errorGenFailed[lang]);
      setCurrentStep(AppStep.CONFIG);
      // Auto open modal if key is missing/invalid
      if (err.message && (err.message.includes("API Key") || err.message.includes("401") || err.message.includes("403"))) {
         setShowApiKeyModal(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (generatedImage) {
      setIsPreparingDownload(true);
      try {
        // Process image to remove background before downloading
        const transparentImage = await processImageForDownload(generatedImage);
        
        const link = document.createElement('a');
        link.href = transparentImage;
        link.download = `toonmoji-${selectedStyle.id}-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (e) {
        console.error("Download processing failed", e);
        // Fallback to raw image if processing fails
        const link = document.createElement('a');
        link.href = generatedImage;
        link.download = `toonmoji-${selectedStyle.id}-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } finally {
        setIsPreparingDownload(false);
      }
    }
  };

  const handleZipDownload = async () => {
    if (processedStickers.length === 0) return;
    
    setIsZipping(true);
    try {
      const zipBlob = await createZipFromStickers(processedStickers, `sticker_${selectedStyle.id}`);
      
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `toonmoji_pack_240px_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      setError(t.errorZipFailed[lang]);
    } finally {
      setIsZipping(false);
    }
  };

  const totalPages = Math.ceil(CARTOON_STYLES.length / ITEMS_PER_PAGE);
  const currentStyles = CARTOON_STYLES.slice(stylePage * ITEMS_PER_PAGE, (stylePage + 1) * ITEMS_PER_PAGE);

  const getEmotionLabel = (id: string) => {
    const emotion = PRESET_EMOTIONS.find(e => e.id === id);
    return emotion ? emotion.label[lang] : id;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Editor Modal */}
      {editingSticker && (
        <StickerEditor 
          sticker={editingSticker} 
          isOpen={true} 
          onClose={() => setEditingSticker(null)}
          lang={lang}
          emotionLabel={editingEmotion}
          styleLabel={selectedStyle.label.en}
        />
      )}

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Key className="text-indigo-400" size={20} />
                {t.apiKeyTitle[lang]}
              </h3>
              <button onClick={() => setShowApiKeyModal(false)} className="text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <p className="text-slate-300 text-sm mb-4">
              {t.apiKeyDesc[lang]}
            </p>

            <div className="space-y-4">
              <input 
                type="password" 
                value={userApiKey}
                onChange={(e) => setUserApiKey(e.target.value)}
                placeholder={t.apiKeyPlaceholder[lang]}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 text-white"
              />
              
              <div className="flex gap-3">
                <Button fullWidth onClick={handleSaveApiKey}>
                  <Save size={18} /> {t.saveKey[lang]}
                </Button>
                {userApiKey && (
                  <Button variant="secondary" onClick={handleClearApiKey}>
                    {t.clearKey[lang]}
                  </Button>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800 text-center space-y-2">
                 <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center justify-center gap-1"
                 >
                   {t.getKeyLink[lang]} <ExternalLink size={12} />
                 </a>
                 <p className="text-[10px] text-slate-600">
                   {t.apiKeyEnvTip[lang]}
                 </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-2 rounded-lg">
              <Smile size={24} className="text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              {t.title[lang]}
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
             <button 
              onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
              className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-400 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-full border border-slate-700"
            >
              <Languages size={14} />
              {lang === 'en' ? '中文切换' : 'English Switch'}
            </button>
            <div className="hidden md:block text-xs text-slate-500 border border-slate-800 px-3 py-1 rounded-full">
              {t.subtitle[lang]}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        
        <StepIndicator currentStep={currentStep} lang={lang} />

        {/* Content Area */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 md:p-8 min-h-[500px] shadow-2xl relative overflow-hidden flex flex-col">
          
          {/* Background Decorative Blobs */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

          {/* STEP 1: UPLOAD */}
          {currentStep === AppStep.UPLOAD && (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] animate-fade-in">
              <div 
                className={`
                  w-full max-w-xl border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300
                  ${sourceImage ? 'border-green-500/50 bg-green-500/5' : 'border-slate-600 hover:border-indigo-500 hover:bg-slate-700/50'}
                `}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file && file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (ev) => setSourceImage(ev.target?.result as string);
                    reader.readAsDataURL(file);
                  }
                }}
              >
                {sourceImage ? (
                  <div className="relative group">
                    <img 
                      src={sourceImage} 
                      alt="Upload Preview" 
                      className="max-h-64 mx-auto rounded-lg shadow-lg object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                      <Button variant="secondary" onClick={() => setSourceImage(null)}>
                        {t.changeImage[lang]}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-20 h-20 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Upload size={32} className="text-indigo-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white">{t.uploadTitle[lang]}</h3>
                    <p className="text-slate-400">{t.uploadDesc[lang]}</p>
                    <p className="text-xs text-slate-500">{t.uploadSupport[lang]}</p>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      accept="image/*" 
                      className="hidden" 
                    />
                    <Button onClick={() => fileInputRef.current?.click()} variant="outline">
                      {t.selectFile[lang]}
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="mt-8">
                <Button 
                  disabled={!sourceImage} 
                  onClick={() => setCurrentStep(AppStep.STYLE)}
                  className="w-48"
                >
                  {t.nextStep[lang]} <ArrowRight size={18} />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: STYLE SELECTION */}
          {currentStep === AppStep.STYLE && (
            <div className="animate-fade-in flex flex-col h-full">
              <div className="flex flex-col md:flex-row gap-8 flex-1">
                <div className="md:w-1/3 space-y-4">
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                    <h3 className="text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wider">{t.styleRef[lang]}</h3>
                    <img src={sourceImage!} alt="Original" className="w-full rounded-lg" />
                  </div>
                  <div className="bg-indigo-900/20 p-4 rounded-xl border border-indigo-500/20">
                    <h4 className="font-bold text-indigo-300 flex items-center gap-2">
                      <Wand2 size={16} /> {t.styleTipTitle[lang]}
                    </h4>
                    <p className="text-sm text-indigo-200 mt-2">
                      {t.styleTipDesc[lang]}
                    </p>
                  </div>
                </div>

                <div className="md:w-2/3 flex flex-col">
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <ImageIcon className="text-indigo-400" /> {t.chooseStyle[lang]}
                  </h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    {currentStyles.map((style) => (
                      <StyleCard 
                        key={style.id} 
                        style={style} 
                        isSelected={selectedStyle.id === style.id} 
                        onSelect={setSelectedStyle} 
                        lang={lang}
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-between bg-slate-900/30 p-2 rounded-lg border border-slate-700 mt-auto">
                    <Button 
                      variant="secondary" 
                      onClick={() => setStylePage(p => Math.max(0, p - 1))}
                      disabled={stylePage === 0}
                      className="px-3 py-1.5 h-8 text-sm"
                    >
                      <ChevronLeft size={14} /> {t.prevPage[lang]}
                    </Button>
                    <span className="text-sm text-slate-400">
                      {t.page[lang]} {stylePage + 1} / {totalPages}
                    </span>
                    <Button 
                      variant="secondary" 
                      onClick={() => setStylePage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={stylePage >= totalPages - 1}
                      className="px-3 py-1.5 h-8 text-sm"
                    >
                      {t.nextPage[lang]} <ChevronRight size={14} />
                    </Button>
                  </div>

                  <div className="mt-8 flex justify-between">
                    <Button variant="secondary" onClick={() => setCurrentStep(AppStep.UPLOAD)}>
                      <ArrowLeft size={18} /> {t.back[lang]}
                    </Button>
                    <Button onClick={() => setCurrentStep(AppStep.CONFIG)}>
                      {t.nextStep[lang]} <ArrowRight size={18} />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: CONFIGURATION */}
          {currentStep === AppStep.CONFIG && (
            <div className="animate-fade-in max-w-4xl mx-auto w-full">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Settings className="text-indigo-400" /> {t.configTitle[lang]}
              </h2>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700">
                    <h3 className="font-semibold mb-4">{t.numStickers[lang]}</h3>
                    <div className="flex gap-4">
                      {[3, 6, 9].map((num) => (
                        <button
                          key={num}
                          onClick={() => setExpressionCount(num as 3|6|9)}
                          className={`
                            flex-1 py-3 rounded-lg font-bold text-lg transition-all
                            ${expressionCount === num 
                              ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900' 
                              : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}
                          `}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700">
                    <h3 className="font-semibold mb-2">{t.selectedEmotions[lang]} ({selectedEmotionIds.length}/{expressionCount})</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedEmotionIds.map(id => (
                        <span key={id} className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-sm border border-indigo-500/30 flex items-center gap-1">
                          {getEmotionLabel(id)}
                          <button onClick={() => toggleEmotion(id)} className="hover:text-white">&times;</button>
                        </span>
                      ))}
                       {customEmotion && !selectedEmotionIds.includes(customEmotion) && (
                         <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-sm border border-indigo-500/30 flex items-center gap-1">
                            {customEmotion}
                         </span>
                      )}
                      {Array.from({ length: Math.max(0, expressionCount - selectedEmotionIds.length) }).map((_, i) => (
                        <span key={`empty-${i}`} className="px-3 py-1 bg-slate-800 text-slate-600 rounded-full text-sm border border-slate-700 border-dashed">
                          {t.selectMore[lang]}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700 h-full">
                    <h3 className="font-semibold mb-4">{t.chooseEmotions[lang]}</h3>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {PRESET_EMOTIONS.map((emotion) => (
                        <button
                          key={emotion.id}
                          onClick={() => toggleEmotion(emotion.id)}
                          className={`
                            px-3 py-2 rounded-lg text-sm transition-all border
                            ${selectedEmotionIds.includes(emotion.id)
                              ? 'bg-indigo-600 border-indigo-500 text-white'
                              : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-500'}
                          `}
                        >
                          {emotion.label[lang]}
                        </button>
                      ))}
                    </div>
                    
                    <div className="pt-4 border-t border-slate-700">
                      <label className="text-sm text-slate-400 mb-2 block">{t.customEmotion[lang]}</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customEmotion}
                          onChange={(e) => setCustomEmotion(e.target.value)}
                          placeholder={t.customPlaceholder[lang]}
                          className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
                        />
                        <Button 
                          variant="secondary" 
                          onClick={() => {
                            if(customEmotion && !selectedEmotionIds.includes(customEmotion)) {
                              toggleEmotion(customEmotion);
                              setCustomEmotion('');
                            }
                          }}
                          disabled={!customEmotion}
                          className="py-2"
                        >
                          {t.add[lang]}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* API Key Configuration Button */}
              <div className="mt-4 flex justify-end">
                 <button onClick={handleOpenApiKeySettings} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                    <Key size={12} /> {t.configureApiKey[lang]}
                 </button>
              </div>

              {error && (
                 <div className="mt-6 p-4 bg-red-500/10 border border-red-500/50 text-red-200 rounded-lg text-sm text-center flex flex-col items-center gap-2">
                   <span>{error}</span>
                   {error.includes("API Key") && (
                     <Button size="sm" variant="outline" onClick={handleOpenApiKeySettings} className="mt-2 border-red-400 text-red-200 hover:bg-red-900/50">
                        {t.configureApiKey[lang]}
                     </Button>
                   )}
                 </div>
              )}

              <div className="mt-8 flex justify-between">
                <Button variant="secondary" onClick={() => setCurrentStep(AppStep.STYLE)}>
                  <ArrowLeft size={18} /> {t.back[lang]}
                </Button>
                <Button onClick={handleGenerate} className="w-48 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500">
                  <Wand2 size={18} /> {t.generateBtn[lang]}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3.5: GENERATING */}
          {currentStep === AppStep.GENERATING && (
            <div className="flex flex-col items-center justify-center min-h-[400px] animate-fade-in text-center">
              <div className="relative w-24 h-24 mb-8">
                <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-t-indigo-500 border-r-indigo-500 border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                   <Wand2 className="text-indigo-400 animate-pulse" size={32} />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{t.genTitle[lang]}</h2>
              <p className="text-slate-400 max-w-md">
                {t.genDesc[lang]}
              </p>
            </div>
          )}

          {/* STEP 4: RESULT */}
          {currentStep === AppStep.RESULT && generatedImage && (
             <div className="animate-fade-in flex flex-col h-full">
                <div className="flex-1 flex flex-col gap-6 min-h-[400px]">
                   
                   {/* Top Split: Original Sheet & Actions */}
                   <div className="flex flex-col md:flex-row gap-8">
                      <div className="md:w-3/4 bg-slate-950 rounded-xl overflow-hidden border border-slate-700 relative group flex items-center justify-center min-h-[300px]">
                          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                          <img 
                            src={generatedImage} 
                            alt="Generated Stickers" 
                            className="max-h-[400px] max-w-full object-contain shadow-2xl"
                          />
                      </div>

                      <div className="md:w-1/4 space-y-4 flex flex-col">
                          <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-700 flex-1">
                            <h3 className="font-bold text-lg mb-4 text-white">{t.resultTitle[lang]}</h3>
                            <p className="text-sm text-slate-400 mb-6">
                              {t.resultDesc[lang]}
                            </p>
                            
                            <Button 
                              onClick={handleDownload} 
                              fullWidth 
                              className="mb-3"
                              disabled={isPreparingDownload}
                            >
                              {isPreparingDownload ? <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></div> : <Download size={18} />}
                              {isPreparingDownload ? (lang === 'en' ? 'Processing...' : '处理中...') : t.download[lang]}
                            </Button>

                            <Button 
                              onClick={handleZipDownload} 
                              fullWidth 
                              disabled={isZipping || processedStickers.length === 0}
                              variant="primary"
                              className="mb-3 bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20"
                            >
                              {isZipping ? (
                                <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></div>
                              ) : (
                                <FileArchive size={18} />
                              )}
                              {isZipping ? t.processingZip[lang] : t.downloadZip[lang]}
                            </Button>
                            
                            <Button variant="outline" fullWidth onClick={handleGenerate}>
                              <RefreshCw size={18} /> {t.regenerate[lang]}
                            </Button>
                          </div>
                          
                          <Button variant="secondary" onClick={() => setCurrentStep(AppStep.CONFIG)} className="mt-auto">
                            <ArrowLeft size={18} /> {t.startOver[lang]}
                          </Button>
                      </div>
                   </div>

                   {/* Bottom: Individual Sticker Grid */}
                   <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700">
                     <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                       <Scissors size={20} className="text-indigo-400" />
                       {lang === 'en' ? 'Sticker Studio (240px)' : '表情裁剪与动效 (240px)'}
                     </h3>
                     
                     {isProcessingStickers ? (
                       <div className="flex items-center justify-center h-40 gap-3 text-slate-400">
                         <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                         {t.processingZip[lang]}
                       </div>
                     ) : (
                       <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                         {processedStickers.map((sticker, index) => (
                           <div key={sticker.id} className="group relative bg-slate-800 rounded-lg p-2 border border-slate-700 hover:border-indigo-500 transition-colors">
                              <div className="aspect-square bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-slate-900 rounded-md overflow-hidden flex items-center justify-center mb-2">
                                <img src={sticker.src} alt="Sticker" className="w-full h-full object-contain" />
                              </div>
                              <button 
                                onClick={() => {
                                  // Map index to emotion label if possible
                                  const label = generatedPromptEmotions[index] || 'Happy';
                                  setEditingEmotion(label);
                                  setEditingSticker(sticker);
                                }}
                                className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded font-medium flex items-center justify-center gap-1"
                              >
                                <Wand2 size={12} /> {lang === 'en' ? 'Animate' : '动效'}
                              </button>
                           </div>
                         ))}
                       </div>
                     )}
                   </div>

                </div>
             </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default App;