import React, { useState, useRef, useEffect } from 'react';
import { Upload, ArrowRight, ArrowLeft, Wand2, Download, RefreshCw, Image as ImageIcon, Smile, Settings, Languages, ChevronLeft, ChevronRight, FileArchive, Scissors, Key, X, ExternalLink, Save, Palette } from 'lucide-react';
import { AppStep, StyleOption, Language, ProcessedSticker, ThemeConfig } from './types';
import { CARTOON_STYLES, PRESET_EMOTIONS, UI_TEXT, THEMES } from './constants';
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
  
  // Theme State
  const [currentThemeId, setCurrentThemeId] = useState<string>('gallery'); // Default to Light theme as requested
  
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

  // Derived Theme
  const theme = THEMES.find(t => t.id === currentThemeId) || THEMES[1];

  // Load API Key from local storage on mount
  useEffect(() => {
    const stored = localStorage.getItem('gemini_api_key');
    if (stored) setUserApiKey(stored);
    
    // Optional: Load saved theme
    const savedTheme = localStorage.getItem('toonmoji_theme');
    if (savedTheme && THEMES.some(t => t.id === savedTheme)) {
        setCurrentThemeId(savedTheme);
    }
  }, []);

  const switchTheme = () => {
      const currentIndex = THEMES.findIndex(t => t.id === currentThemeId);
      const nextIndex = (currentIndex + 1) % THEMES.length;
      const nextTheme = THEMES[nextIndex].id;
      setCurrentThemeId(nextTheme);
      localStorage.setItem('toonmoji_theme', nextTheme);
  };

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
    <div className={`min-h-screen flex flex-col font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-500 ${theme.colors.bg} ${theme.colors.text}`}>
      {/* Editor Modal */}
      {editingSticker && (
        <StickerEditor 
          sticker={editingSticker} 
          isOpen={true} 
          onClose={() => setEditingSticker(null)}
          lang={lang}
          emotionLabel={editingEmotion}
          styleLabel={selectedStyle.label.en}
          theme={theme}
        />
      )}

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`${theme.colors.panel} border ${theme.colors.border} rounded-2xl w-full max-w-md shadow-2xl p-6`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-xl font-bold flex items-center gap-2 ${theme.colors.text}`}>
                <Key className="text-indigo-400" size={20} />
                {t.apiKeyTitle[lang]}
              </h3>
              <button onClick={() => setShowApiKeyModal(false)} className={`${theme.colors.textSecondary} hover:${theme.colors.text}`}>
                <X size={24} />
              </button>
            </div>
            
            <p className={`${theme.colors.textSecondary} text-sm mb-4`}>
              {t.apiKeyDesc[lang]}
            </p>

            <div className="space-y-4">
              <input 
                type="password" 
                value={userApiKey}
                onChange={(e) => setUserApiKey(e.target.value)}
                placeholder={t.apiKeyPlaceholder[lang]}
                className={`w-full ${theme.colors.inputBg} border ${theme.colors.border} rounded-lg px-4 py-3 focus:outline-none focus:${theme.colors.ring} ${theme.colors.text}`}
              />
              
              <div className="flex gap-3">
                <Button 
                    fullWidth 
                    onClick={handleSaveApiKey}
                    className={`${theme.colors.accent} ${theme.colors.accentText} ${theme.colors.accentHover}`}
                >
                  <Save size={18} /> {t.saveKey[lang]}
                </Button>
                {userApiKey && (
                  <Button 
                    variant="secondary" 
                    onClick={handleClearApiKey}
                    className={`${theme.colors.secondaryBtn} ${theme.colors.secondaryBtnText}`}
                  >
                    {t.clearKey[lang]}
                  </Button>
                )}
              </div>

              <div className={`pt-4 border-t ${theme.colors.border} text-center space-y-2`}>
                 <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center justify-center gap-1"
                 >
                   {t.getKeyLink[lang]} <ExternalLink size={12} />
                 </a>
                 <p className={`text-[10px] ${theme.colors.textSecondary}`}>
                   {t.apiKeyEnvTip[lang]}
                 </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className={`border-b ${theme.colors.border} ${theme.colors.panel} backdrop-blur-md sticky top-0 z-50 transition-colors duration-500`}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500`}>
              <Smile size={24} className="text-white" />
            </div>
            <h1 className={`text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${currentThemeId === 'cosmic' ? 'from-white to-slate-400' : 'from-indigo-600 to-purple-600'}`}>
              {t.title[lang]}
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
                onClick={switchTheme}
                className={`flex items-center gap-1.5 text-xs sm:text-sm font-medium transition-colors px-3 py-1.5 rounded-full border ${theme.colors.secondaryBtn} ${theme.colors.secondaryBtnText} ${theme.colors.border}`}
                title="Switch Theme"
            >
                <Palette size={14} />
                {theme.name[lang]}
            </button>
             <button 
              onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
              className={`flex items-center gap-1.5 text-xs sm:text-sm font-medium transition-colors px-3 py-1.5 rounded-full border ${theme.colors.secondaryBtn} ${theme.colors.secondaryBtnText} ${theme.colors.border}`}
            >
              <Languages size={14} />
              {lang === 'en' ? 'CN' : 'EN'}
            </button>
            <div className={`hidden md:block text-xs px-3 py-1 rounded-full border ${theme.colors.border} ${theme.colors.textSecondary}`}>
              {t.subtitle[lang]}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 relative">
        
        <StepIndicator currentStep={currentStep} lang={lang} theme={theme} />

        {/* Content Area */}
        <div className={`${theme.colors.panel} border ${theme.colors.panelBorder} rounded-2xl p-6 md:p-8 min-h-[500px] shadow-2xl relative overflow-hidden flex flex-col transition-colors duration-500`}>
          
          {/* Background Decorative Blobs */}
          <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none transition-colors duration-500 ${theme.colors.blob1}`}></div>
          <div className={`absolute bottom-0 left-0 w-96 h-96 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none transition-colors duration-500 ${theme.colors.blob2}`}></div>

          {/* STEP 1: UPLOAD */}
          {currentStep === AppStep.UPLOAD && (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] animate-fade-in z-10">
              <div 
                className={`
                  w-full max-w-xl border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300
                  ${sourceImage 
                    ? `border-green-500/50 bg-green-500/5` 
                    : `${theme.colors.border} hover:border-indigo-500 ${theme.colors.inputBg}`}
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
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${theme.colors.secondaryBtn}`}>
                      <Upload size={32} className={theme.colors.text} />
                    </div>
                    <h3 className={`text-xl font-semibold ${theme.colors.text}`}>{t.uploadTitle[lang]}</h3>
                    <p className={theme.colors.textSecondary}>{t.uploadDesc[lang]}</p>
                    <p className={`text-xs ${theme.colors.textSecondary}`}>{t.uploadSupport[lang]}</p>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      accept="image/*" 
                      className="hidden" 
                    />
                    <Button 
                        onClick={() => fileInputRef.current?.click()} 
                        variant="outline"
                        className={`border-current ${theme.colors.text} hover:opacity-70`}
                    >
                      {t.selectFile[lang]}
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="mt-8">
                <Button 
                  disabled={!sourceImage} 
                  onClick={() => setCurrentStep(AppStep.STYLE)}
                  className={`w-48 ${theme.colors.accent} ${theme.colors.accentText} ${theme.colors.accentHover}`}
                >
                  {t.nextStep[lang]} <ArrowRight size={18} />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: STYLE SELECTION */}
          {currentStep === AppStep.STYLE && (
            <div className="animate-fade-in flex flex-col h-full z-10">
              <div className="flex flex-col md:flex-row gap-8 flex-1">
                <div className="md:w-1/3 space-y-4">
                  <div className={`${theme.colors.panel} p-4 rounded-xl border ${theme.colors.border}`}>
                    <h3 className={`text-sm font-semibold ${theme.colors.textSecondary} mb-2 uppercase tracking-wider`}>{t.styleRef[lang]}</h3>
                    <img src={sourceImage!} alt="Original" className="w-full rounded-lg" />
                  </div>
                  <div className={`p-4 rounded-xl border border-indigo-500/20 ${theme.id === 'cosmic' ? 'bg-indigo-900/20' : 'bg-indigo-50'}`}>
                    <h4 className="font-bold text-indigo-500 flex items-center gap-2">
                      <Wand2 size={16} /> {t.styleTipTitle[lang]}
                    </h4>
                    <p className={`text-sm mt-2 ${theme.colors.textSecondary}`}>
                      {t.styleTipDesc[lang]}
                    </p>
                  </div>
                </div>

                <div className="md:w-2/3 flex flex-col">
                  <h2 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${theme.colors.text}`}>
                    <ImageIcon className="text-indigo-500" /> {t.chooseStyle[lang]}
                  </h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    {currentStyles.map((style) => (
                      <StyleCard 
                        key={style.id} 
                        style={style} 
                        isSelected={selectedStyle.id === style.id} 
                        onSelect={setSelectedStyle} 
                        lang={lang}
                        theme={theme}
                      />
                    ))}
                  </div>

                  <div className={`flex items-center justify-between p-2 rounded-lg border ${theme.colors.border} mt-auto`}>
                    <Button 
                      variant="secondary" 
                      onClick={() => setStylePage(p => Math.max(0, p - 1))}
                      disabled={stylePage === 0}
                      className={`px-3 py-1.5 h-8 text-sm ${theme.colors.secondaryBtn} ${theme.colors.secondaryBtnText}`}
                    >
                      <ChevronLeft size={14} /> {t.prevPage[lang]}
                    </Button>
                    <span className={`text-sm ${theme.colors.textSecondary}`}>
                      {t.page[lang]} {stylePage + 1} / {totalPages}
                    </span>
                    <Button 
                      variant="secondary" 
                      onClick={() => setStylePage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={stylePage >= totalPages - 1}
                      className={`px-3 py-1.5 h-8 text-sm ${theme.colors.secondaryBtn} ${theme.colors.secondaryBtnText}`}
                    >
                      {t.nextPage[lang]} <ChevronRight size={14} />
                    </Button>
                  </div>

                  <div className="mt-8 flex justify-between">
                    <Button 
                        variant="secondary" 
                        onClick={() => setCurrentStep(AppStep.UPLOAD)}
                        className={`${theme.colors.secondaryBtn} ${theme.colors.secondaryBtnText}`}
                    >
                      <ArrowLeft size={18} /> {t.back[lang]}
                    </Button>
                    <Button 
                        onClick={() => setCurrentStep(AppStep.CONFIG)}
                        className={`${theme.colors.accent} ${theme.colors.accentText} ${theme.colors.accentHover}`}
                    >
                      {t.nextStep[lang]} <ArrowRight size={18} />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: CONFIGURATION */}
          {currentStep === AppStep.CONFIG && (
            <div className="animate-fade-in max-w-4xl mx-auto w-full z-10">
              <h2 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${theme.colors.text}`}>
                <Settings className="text-indigo-500" /> {t.configTitle[lang]}
              </h2>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className={`${theme.colors.panel} p-6 rounded-xl border ${theme.colors.border}`}>
                    <h3 className={`font-semibold mb-4 ${theme.colors.text}`}>{t.numStickers[lang]}</h3>
                    <div className="flex gap-4">
                      {[3, 6, 9].map((num) => (
                        <button
                          key={num}
                          onClick={() => setExpressionCount(num as 3|6|9)}
                          className={`
                            flex-1 py-3 rounded-lg font-bold text-lg transition-all
                            ${expressionCount === num 
                              ? `${theme.colors.accent} ${theme.colors.accentText} ring-2 ring-indigo-400 ring-offset-2 ring-offset-transparent` 
                              : `${theme.colors.secondaryBtn} ${theme.colors.textSecondary} hover:opacity-80`}
                          `}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={`${theme.colors.panel} p-6 rounded-xl border ${theme.colors.border}`}>
                    <h3 className={`font-semibold mb-2 ${theme.colors.text}`}>{t.selectedEmotions[lang]} ({selectedEmotionIds.length}/{expressionCount})</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedEmotionIds.map(id => (
                        <span key={id} className={`px-3 py-1 rounded-full text-sm border flex items-center gap-1 ${theme.id === 'cosmic' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>
                          {getEmotionLabel(id)}
                          <button onClick={() => toggleEmotion(id)} className="hover:opacity-70">&times;</button>
                        </span>
                      ))}
                       {customEmotion && !selectedEmotionIds.includes(customEmotion) && (
                         <span className={`px-3 py-1 rounded-full text-sm border flex items-center gap-1 ${theme.id === 'cosmic' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>
                            {customEmotion}
                         </span>
                      )}
                      {Array.from({ length: Math.max(0, expressionCount - selectedEmotionIds.length) }).map((_, i) => (
                        <span key={`empty-${i}`} className={`px-3 py-1 rounded-full text-sm border border-dashed ${theme.colors.textSecondary} ${theme.colors.border}`}>
                          {t.selectMore[lang]}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className={`${theme.colors.panel} p-6 rounded-xl border ${theme.colors.border} h-full`}>
                    <h3 className={`font-semibold mb-4 ${theme.colors.text}`}>{t.chooseEmotions[lang]}</h3>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {PRESET_EMOTIONS.map((emotion) => (
                        <button
                          key={emotion.id}
                          onClick={() => toggleEmotion(emotion.id)}
                          className={`
                            px-3 py-2 rounded-lg text-sm transition-all border
                            ${selectedEmotionIds.includes(emotion.id)
                              ? `${theme.colors.accent} border-transparent ${theme.colors.accentText}`
                              : `${theme.colors.secondaryBtn} ${theme.colors.border} ${theme.colors.textSecondary} hover:${theme.colors.text}`}
                          `}
                        >
                          {emotion.label[lang]}
                        </button>
                      ))}
                    </div>
                    
                    <div className={`pt-4 border-t ${theme.colors.border}`}>
                      <label className={`text-sm ${theme.colors.textSecondary} mb-2 block`}>{t.customEmotion[lang]}</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customEmotion}
                          onChange={(e) => setCustomEmotion(e.target.value)}
                          placeholder={t.customPlaceholder[lang]}
                          className={`flex-1 ${theme.colors.inputBg} border ${theme.colors.border} rounded-lg px-4 py-2 text-sm focus:outline-none focus:${theme.colors.ring} ${theme.colors.text}`}
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
                          className={`py-2 ${theme.colors.secondaryBtn} ${theme.colors.secondaryBtnText}`}
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
                 <div className="mt-6 p-4 bg-red-500/10 border border-red-500/50 text-red-500 rounded-lg text-sm text-center flex flex-col items-center gap-2">
                   <span>{error}</span>
                   {error.includes("API Key") && (
                     <Button size="sm" variant="outline" onClick={handleOpenApiKeySettings} className="mt-2 border-red-400 text-red-500 hover:bg-red-50">
                        {t.configureApiKey[lang]}
                     </Button>
                   )}
                 </div>
              )}

              <div className="mt-8 flex justify-between">
                <Button variant="secondary" onClick={() => setCurrentStep(AppStep.STYLE)} className={`${theme.colors.secondaryBtn} ${theme.colors.secondaryBtnText}`}>
                  <ArrowLeft size={18} /> {t.back[lang]}
                </Button>
                <Button onClick={handleGenerate} className={`w-48 ${theme.colors.accent} ${theme.colors.accentText} ${theme.colors.accentHover}`}>
                  <Wand2 size={18} /> {t.generateBtn[lang]}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3.5: GENERATING */}
          {currentStep === AppStep.GENERATING && (
            <div className="flex flex-col items-center justify-center min-h-[400px] animate-fade-in text-center z-10">
              <div className="relative w-24 h-24 mb-8">
                <div className={`absolute inset-0 border-4 ${theme.colors.border} rounded-full`}></div>
                <div className="absolute inset-0 border-4 border-t-indigo-500 border-r-indigo-500 border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                   <Wand2 className="text-indigo-500 animate-pulse" size={32} />
                </div>
              </div>
              <h2 className={`text-2xl font-bold ${theme.colors.text} mb-2`}>{t.genTitle[lang]}</h2>
              <p className={`${theme.colors.textSecondary} max-w-md`}>
                {t.genDesc[lang]}
              </p>
            </div>
          )}

          {/* STEP 4: RESULT */}
          {currentStep === AppStep.RESULT && generatedImage && (
             <div className="animate-fade-in flex flex-col h-full z-10">
                <div className="flex-1 flex flex-col gap-6 min-h-[400px]">
                   
                   {/* Top Split: Original Sheet & Actions */}
                   <div className="flex flex-col md:flex-row gap-8">
                      <div className={`md:w-3/4 rounded-xl overflow-hidden border ${theme.colors.border} relative group flex items-center justify-center min-h-[300px] ${theme.id === 'cosmic' ? 'bg-slate-950' : 'bg-gray-100'}`}>
                          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                          <img 
                            src={generatedImage} 
                            alt="Generated Stickers" 
                            className="max-h-[400px] max-w-full object-contain shadow-2xl"
                          />
                      </div>

                      <div className="md:w-1/4 space-y-4 flex flex-col">
                          <div className={`${theme.colors.panel} p-5 rounded-xl border ${theme.colors.border} flex-1`}>
                            <h3 className={`font-bold text-lg mb-4 ${theme.colors.text}`}>{t.resultTitle[lang]}</h3>
                            <p className={`text-sm ${theme.colors.textSecondary} mb-6`}>
                              {t.resultDesc[lang]}
                            </p>
                            
                            <Button 
                              onClick={handleDownload} 
                              fullWidth 
                              className={`mb-3 ${theme.colors.accent} ${theme.colors.accentText} ${theme.colors.accentHover}`}
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
                              className={`mb-3 ${theme.colors.success} text-white hover:opacity-90 shadow-lg`}
                            >
                              {isZipping ? (
                                <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></div>
                              ) : (
                                <FileArchive size={18} />
                              )}
                              {isZipping ? t.processingZip[lang] : t.downloadZip[lang]}
                            </Button>
                            
                            <Button variant="outline" fullWidth onClick={handleGenerate} className={`${theme.colors.text} border-current`}>
                              <RefreshCw size={18} /> {t.regenerate[lang]}
                            </Button>
                          </div>
                          
                          <Button variant="secondary" onClick={() => setCurrentStep(AppStep.CONFIG)} className={`mt-auto ${theme.colors.secondaryBtn} ${theme.colors.secondaryBtnText}`}>
                            <ArrowLeft size={18} /> {t.startOver[lang]}
                          </Button>
                      </div>
                   </div>

                   {/* Bottom: Individual Sticker Grid */}
                   <div className={`${theme.colors.panel} p-6 rounded-xl border ${theme.colors.border}`}>
                     <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${theme.colors.text}`}>
                       <Scissors size={20} className="text-indigo-500" />
                       {lang === 'en' ? 'Sticker Studio (240px)' : '表情裁剪与动效 (240px)'}
                     </h3>
                     
                     {isProcessingStickers ? (
                       <div className={`flex items-center justify-center h-40 gap-3 ${theme.colors.textSecondary}`}>
                         <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                         {t.processingZip[lang]}
                       </div>
                     ) : (
                       <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                         {processedStickers.map((sticker, index) => (
                           <div key={sticker.id} className={`group relative rounded-lg p-2 border ${theme.colors.border} hover:border-indigo-500 transition-colors ${theme.colors.inputBg}`}>
                              <div className={`aspect-square bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] rounded-md overflow-hidden flex items-center justify-center mb-2 ${theme.id === 'cosmic' ? 'bg-slate-900' : 'bg-gray-100'}`}>
                                <img src={sticker.src} alt="Sticker" className="w-full h-full object-contain" />
                              </div>
                              <button 
                                onClick={() => {
                                  // Map index to emotion label if possible
                                  const label = generatedPromptEmotions[index] || 'Happy';
                                  setEditingEmotion(label);
                                  setEditingSticker(sticker);
                                }}
                                className={`w-full py-1.5 text-xs rounded font-medium flex items-center justify-center gap-1 ${theme.colors.accent} ${theme.colors.accentText} ${theme.colors.accentHover}`}
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

      {/* Footer */}
      <footer className={`py-8 mt-auto border-t ${theme.colors.border} ${theme.colors.panel} transition-colors duration-500`}>
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className={`font-medium mb-2 ${theme.colors.text}`}>
            陈子卓野的实验室
          </p>
          <a 
            href="https://beian.miit.gov.cn/" 
            target="_blank" 
            rel="noopener noreferrer"
            className={`text-sm ${theme.colors.textSecondary} hover:${theme.colors.text} transition-colors`}
          >
            沪ICP备2025153381号-1
          </a>
        </div>
      </footer>
    </div>
  );
};

export default App;