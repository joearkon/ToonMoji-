import { StyleOption, EmotionOption, LocalizedString } from './types';

export const CARTOON_STYLES: StyleOption[] = [
  {
    id: 'meme_sticker',
    label: { en: 'Meme Sticker', zh: '热门表情包' },
    description: {
      en: 'Bold outlines, flat colors, highly expressive meme style.',
      zh: '粗线条描边，扁平上色，高表现力的热门二次元表情包风格。'
    },
    promptModifier: 'in the style of a chibi anime meme sticker, thick bold black outlines, flat vector coloring, exaggerated expressions, white background, high contrast, discord emote style, cute but expressive, cel shaded, distinctive vector art style, often includes impact text or speech bubbles',
    previewColor: 'from-yellow-400 to-orange-500',
  },
  {
    id: 'nendoroid',
    label: { en: 'Nendoroid Figure', zh: '粘土人手办' },
    description: {
      en: 'Cute chibi style with large heads and small bodies, like Good Smile Company figures.',
      zh: '好微笑（Good Smile）粘土人风格，Q版大头小身，可爱的PVC手办质感。'
    },
    promptModifier: 'in the style of a Good Smile Company Nendoroid action figure, chibi proportions, large head and small body (2 heads tall), cute anime face, high quality PVC plastic texture, studio lighting, clean paint application, kawaii aesthetic, 3d render, detailed hair sculpting',
    previewColor: 'from-orange-400 to-amber-500',
  },
  {
    id: 'modern_anime',
    label: { en: 'Modern Anime', zh: '日漫风格' },
    description: {
      en: 'Sharp lines, vibrant colors, classic commercial anime look.',
      zh: '线条锐利，色彩鲜艳，经典的商业日漫/二次元风格。'
    },
    promptModifier: 'in a modern Japanese anime style, high quality 2D cel shaded character design, vibrant colors, detailed expressive eyes, sharp line art, anime key visual quality, standard shonen or shoujo anime aesthetic, clean lines',
    previewColor: 'from-pink-500 to-rose-500',
  },
  {
    id: 'chinese_ink',
    label: { en: 'Chinese Ink', zh: '中国风' },
    description: {
      en: 'Traditional ink wash painting, elegant strokes, atmospheric.',
      zh: '传统水墨画风格，笔触优雅，意境深远，唯美古风。'
    },
    promptModifier: 'in the style of traditional Chinese ink wash painting (Shuimo), artistic brush strokes, elegant ancient Chinese aesthetic, watercolor texture, soft color palette with black ink accents, ethereal atmosphere, masterpiece art',
    previewColor: 'from-stone-400 to-stone-600',
  },
  {
    id: 'cny_festive',
    label: { en: 'Chinese New Year', zh: '新春拜年风' },
    description: {
      en: 'Festive red theme, traditional Hanfu, lanterns, and lucky vibes.',
      zh: '喜庆红火，身着汉服/唐装，灯笼鞭炮，满满的节日氛围。'
    },
    promptModifier: 'in a festive Chinese New Year 3D art style, wearing detailed red traditional clothing (Hanfu/Tang suit) with gold accents, holding a red envelope (Hongbao), surrounding by lanterns and fireworks, cheerful expression, vibrant red and gold color palette, cute proportions, high quality render, festive atmosphere',
    previewColor: 'from-red-600 to-yellow-500',
  },
  {
    id: 'ghibli',
    label: { en: 'Anime Studio', zh: '宫崎骏动漫' },
    description: {
      en: 'Soft colors, lush backgrounds, nostalgic feel like Miyazaki films.',
      zh: '柔和的色彩，丰富的手绘背景，宫崎骏电影般的怀旧感。'
    },
    promptModifier: 'in the style of a Studio Ghibli animated movie, hand-painted background, cel shading, expressive eyes, soft lighting',
    previewColor: 'from-green-400 to-teal-500',
  },
  {
    id: 'pixar',
    label: { en: '3D Animation', zh: '3D 动画' },
    description: {
      en: 'High fidelity 3D render, cute proportions, expressive lighting.',
      zh: '高保真3D渲染，可爱的比例，富有表现力的光照效果。'
    },
    promptModifier: 'in the style of a modern Disney/Pixar 3D animated character, 3D render, octane render, soft subsurface scattering, big expressive eyes, cute proportions',
    previewColor: 'from-blue-400 to-indigo-500',
  },
  {
    id: 'cyberpunk',
    label: { en: 'Cyberpunk', zh: '赛博朋克' },
    description: {
      en: 'Neon lights, sharp outlines, futuristic aesthetic.',
      zh: '霓虹灯光，锐利的轮廓，未来主义的科技美学。'
    },
    promptModifier: 'in a Cyberpunk anime style, neon lighting, chromatic aberration, sharp outlines, futuristic clothing adjustments, intense atmosphere',
    previewColor: 'from-pink-500 to-purple-600',
  },
  {
    id: 'comic',
    label: { en: 'American Comic', zh: '美漫风格' },
    description: {
      en: 'Bold lines, halftones, dynamic shadows.',
      zh: '粗犷的轮廓线，半调网点，动态阴影，波普艺术感。'
    },
    promptModifier: 'in the style of a vintage American comic book, bold black outlines, halftone patterns, pop art aesthetic, vibrant primary colors',
    previewColor: 'from-yellow-400 to-red-500',
  },
  {
    id: 'watercolor',
    label: { en: 'Soft Watercolor', zh: '水彩插画' },
    description: {
      en: 'Artistic, dreamy, gentle brush strokes.',
      zh: '艺术感强，梦幻柔和，细腻的笔触和晕染。'
    },
    promptModifier: 'as a watercolor illustration, soft edges, pastel color palette, paper texture, dreamy and artistic',
    previewColor: 'from-rose-300 to-orange-300',
  },
  {
    id: 'clay',
    label: { en: 'Claymation', zh: '粘土动画' },
    description: {
      en: 'Stop-motion look, plasticine texture.',
      zh: '定格动画外观，橡皮泥质感，指纹细节，手工感。'
    },
    promptModifier: 'in the style of Aardman animations claymation, plasticine texture, fingerprint details, soft global illumination, stop-motion aesthetic',
    previewColor: 'from-amber-600 to-orange-700',
  },
  {
    id: 'illustration',
    label: { en: 'Flat Illustration', zh: '扁平插画' },
    description: {
      en: 'Minimalist, clean shapes, corporate art.',
      zh: '极简主义，干净的几何形状，现代设计感。'
    },
    promptModifier: 'modern flat vector illustration, corporate memphis style, minimalist, clean shapes, pastel colors, no outlines, trendy UI art style',
    previewColor: 'from-teal-400 to-emerald-500',
  },
];

export const PRESET_EMOTIONS: EmotionOption[] = [
  { id: 'Lucky', label: { en: 'Gacha Luck', zh: '欧气' } },
  { id: 'MyFault', label: { en: 'My Fault?', zh: '怪我咯？' } },
  { id: 'LyingFlat', label: { en: 'Lying Flat', zh: '躺平' } },
  { id: 'Sleepy', label: { en: 'Sleepy', zh: '困' } },
  { id: 'Police', label: { en: 'Call 110', zh: '110' } },
  { id: 'Work', label: { en: 'Go to Work', zh: '上工了' } },
  { id: 'Obedient', label: { en: 'Sitting Nicely', zh: '乖巧' } },
  { id: 'Speechless', label: { en: 'Speechless', zh: '无语' } },
  { id: 'Agreeing', label: { en: 'Yes Yes Yes', zh: '对对对' } },
  { id: 'Sighing', label: { en: 'Sighing', zh: '叹气' } },
  { id: 'Happy', label: { en: 'Happy', zh: '开心' } },
  { id: 'Laughing', label: { en: 'Laughing', zh: '大笑' } },
  { id: 'Sad', label: { en: 'Sad', zh: '难过' } },
  { id: 'Crying', label: { en: 'Crying', zh: '哭泣' } },
  { id: 'Angry', label: { en: 'Angry', zh: '生气' } },
  { id: 'Surprised', label: { en: 'Surprised', zh: '惊讶' } },
  { id: 'Confused', label: { en: 'Confused', zh: '疑惑' } },
  { id: 'Love', label: { en: 'Love', zh: '比心' } },
  { id: 'Winking', label: { en: 'Winking', zh: '眨眼' } },
  { id: 'Cool', label: { en: 'Cool', zh: '酷/墨镜' } },
  { id: 'Tired', label: { en: 'Tired', zh: '疲惫' } },
  { id: 'Thinking', label: { en: 'Thinking', zh: '思考' } },
];

export const UI_TEXT: Record<string, LocalizedString> = {
  title: { en: 'ToonMoji GenAI', zh: 'ToonMoji 卡通生成器' },
  subtitle: { en: 'Powered by Gemini 3 Pro', zh: '由 Gemini 3 Pro 驱动' },
  
  // Steps
  stepUpload: { en: 'Upload', zh: '上传' },
  stepStyle: { en: 'Style', zh: '风格' },
  stepConfig: { en: 'Config', zh: '配置' },
  stepResult: { en: 'Result', zh: '结果' },

  // Upload Step
  uploadTitle: { en: 'Upload your photo', zh: '上传您的照片' },
  uploadDesc: { en: 'Drag and drop or click to browse', zh: '拖放或点击浏览' },
  uploadSupport: { en: 'Supports JPG, PNG (Max 5MB)', zh: '支持 JPG, PNG (最大 5MB)' },
  selectFile: { en: 'Select File', zh: '选择文件' },
  changeImage: { en: 'Change Image', zh: '更换图片' },
  nextStep: { en: 'Next Step', zh: '下一步' },

  // Style Step
  styleRef: { en: 'Reference', zh: '参考图' },
  styleTipTitle: { en: 'Gemini Tip', zh: 'Gemini 提示' },
  styleTipDesc: { 
    en: 'Different styles interpret facial features differently. "Anime" simplifies details, while "Clay" adds texture.', 
    zh: '不同的风格对五官的诠释不同。“日漫”会简化细节，而“粘土”会增加质感。'
  },
  chooseStyle: { en: 'Choose Art Style', zh: '选择艺术风格' },
  prevPage: { en: 'Prev', zh: '上一页' },
  nextPage: { en: 'Next', zh: '下一页' },
  page: { en: 'Page', zh: '页' },
  back: { en: 'Back', zh: '返回' },

  // Config Step
  configTitle: { en: 'Configure Sticker Pack', zh: '配置表情包' },
  numStickers: { en: 'Number of Stickers', zh: '表情数量' },
  selectedEmotions: { en: 'Selected Emotions', zh: '已选表情' },
  selectMore: { en: 'Select...', zh: '请选择...' },
  chooseEmotions: { en: 'Choose Emotions', zh: '选择表情' },
  customEmotion: { en: 'Custom Emotion', zh: '自定义表情' },
  customPlaceholder: { en: 'e.g. Eating noodles', zh: '例如：吃面条' },
  add: { en: 'Add', zh: '添加' },
  generateBtn: { en: 'Generate Sticker Pack', zh: '生成表情包' },
  
  // API Key UI
  configureApiKey: { en: 'Settings', zh: '设置 Key' },
  apiKeyTitle: { en: 'Gemini API Configuration', zh: 'Gemini API 配置' },
  apiKeyDesc: { en: 'Enter your Gemini API Key to use the application. It will be stored locally in your browser.', zh: '请输入您的 Gemini API Key 以使用此应用。它将安全地存储在您的浏览器本地缓存中。' },
  apiKeyPlaceholder: { en: 'Paste your API Key here (starts with AIza...)', zh: '在此粘贴您的 API Key (以 AIza 开头...)' },
  saveKey: { en: 'Save API Key', zh: '保存 Key' },
  clearKey: { en: 'Clear Key', zh: '清除 Key' },
  getKeyLink: { en: 'Get a key from Google AI Studio', zh: '前往 Google AI Studio 获取 Key' },
  apiKeyEnvTip: { en: 'Tip: For permanent setup, use environment variables in your deployment settings.', zh: '提示：对于永久部署，建议在部署平台设置环境变量。' },

  // Generating
  genTitle: { en: 'Creating your masterpieces...', zh: '正在创作您的杰作...' },
  genDesc: { 
    en: 'Gemini 3 Pro is analyzing your photo, applying the style, and generating unique expressions. This typically takes 10-20 seconds.', 
    zh: 'Gemini 3 Pro 正在分析您的照片，应用所选风格，并生成独特的表情。这通常需要 10-20 秒。'
  },

  // Result
  resultTitle: { en: 'Result Ready!', zh: '结果已就绪！' },
  resultDesc: { 
    en: 'Here is your sticker sheet. You can download the high-resolution image below or get the ZIP pack with individual stickers.', 
    zh: '这是您的表情包贴纸。您可以下载下方的高清图片，或下载包含裁剪好的单独表情的 ZIP 包。'
  },
  download: { en: 'Download Image', zh: '下载整张图片' },
  downloadZip: { en: 'Download ZIP (Cut)', zh: '下载 ZIP 包 (自动裁剪)' },
  processingZip: { en: 'Cutting Stickers...', zh: '正在裁剪表情...' },
  regenerate: { en: 'Regenerate', zh: '重新生成' },
  startOver: { en: 'Start Over', zh: '重新开始' },
  tipCrop: { 
    en: 'Tip: The ZIP download attempts to automatically crop each sticker for you!', 
    zh: '提示：ZIP 下载会自动尝试为您裁剪出每一个表情！'
  },
  errorFileTooLarge: { en: 'File size too large. Please upload an image under 5MB.', zh: '文件过大。请上传 5MB 以下的图片。' },
  errorGenFailed: { en: 'Failed to generate stickers. Please try again.', zh: '生成失败，请重试。' },
  errorZipFailed: { en: 'Failed to process ZIP. Please try downloading the image instead.', zh: 'ZIP 处理失败，请尝试直接下载图片。' },
};

export const PLACEHOLDER_IMAGE = "https://picsum.photos/400/400";