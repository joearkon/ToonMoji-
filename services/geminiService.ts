import { GoogleGenAI } from "@google/genai";
import { StyleOption } from "../types";

// Helper to check API Key selection for paid models
export const checkAndSelectApiKey = async (): Promise<boolean> => {
  const win = window as any;
  if (win.aistudio && win.aistudio.hasSelectedApiKey) {
    const hasKey = await win.aistudio.hasSelectedApiKey();
    if (!hasKey && win.aistudio.openSelectKey) {
      await win.aistudio.openSelectKey();
      return true; // Assume success after modal
    }
    return true;
  }
  return false; // Fallback for dev environments if wrapper not present
};

export const generateStickerSheet = async (
  base64Image: string,
  style: StyleOption,
  count: number,
  emotions: string[] // Internal strings (usually english or id)
): Promise<string> => {
  // Ensure we have a key selected before initializing
  await checkAndSelectApiKey();

  // Initialize fresh to pick up any newly selected key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Remove data:image/...;base64, prefix if present
  const cleanBase64 = base64Image.split(',')[1] || base64Image;

  // IMPORTANT: Use the English label for the prompt to ensure the model understands the style name context
  const styleName = style.label.en;

  // Define strict grid layout descriptions to force the model to count correctly
  let gridLayoutInstruction = "";
  if (count === 3) {
    gridLayoutInstruction = "Arrange strictly in 1 single horizontal row containing exactly 3 stickers. IMPORTANT: Leave a wide empty vertical gap between each character.";
  } else if (count === 6) {
    gridLayoutInstruction = "Arrange strictly in a 2 rows x 3 columns grid containing exactly 6 stickers. Ensure clear separation between all rows and columns.";
  } else if (count === 9) {
    gridLayoutInstruction = "Arrange strictly in a 3 rows x 3 columns grid containing exactly 9 stickers. Ensure clear separation between all rows and columns.";
  }

  const prompt = `
    Transform the person in the attached reference image into a ${styleName} character.
    Detailed Style Description: ${style.promptModifier}.
    
    TASK:
    Create a high-resolution "Sticker Sheet" containing EXACTLY ${count} distinct variations of this character.
    It is CRITICAL that you generate ${count} stickers, no more, no less.
    
    CRITICAL LAYOUT REQUIREMENTS:
    1. **GRID LAYOUT**: ${gridLayoutInstruction}
    2. **SPACING**: MUST leave wide, generous white space (at least 50px) between every sticker. They must NOT touch or overlap.
    3. **BACKGROUND**: Use a pure flat white background (#FFFFFF).
    4. **COMPOSITION**: Keep the character contained. Do not let hair, effects, or props extend too far and touch adjacent stickers.
    
    MANDATORY IDENTITY & APPEARANCE PRESERVATION:
    1. **HAIRSTYLE**: You MUST EXACTLY replicate the person's hairstyle, hair color, and hair length from the photo. Do not change it.
    2. **CLOTHING**: You MUST EXACTLY replicate the person's clothing style, color, and key details (patterns, collars, accessories) from the photo. 
       - *Exception*: If the style is explicitly a costume style (like "Chinese New Year"), then use the costume described in the style. Otherwise, PRESERVE ORIGINAL CLOTHES.
    3. **FACE**: Maintain key facial features (glasses, facial hair, moles) while adapting them to the ${styleName} aesthetic.
    
    CONTENT REQUIREMENTS:
    1. **EMOTIONS**: Each sticker must show a DIFFERENT emotion from this list: ${emotions.join(', ')}.
    2. **TEXT LANGUAGE**: If the style includes text or speech bubbles, the text MUST be in the same language as the emotion keywords provided above (e.g. if keywords are Chinese, text must be Chinese).
    3. **QUALITY**: The images should be expressive, high quality, sharp focus, and fully finished (no sketches).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          {
            text: prompt,
          },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64,
            },
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: '1:1',
          imageSize: '2K', // High quality request
        },
      },
    });

    // Extract image
    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
           return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("No image generated in response.");

  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    // Handle the specific "Requested entity was not found" for API key issues
    if (error.message && error.message.includes("Requested entity was not found")) {
        const win = window as any;
        if(win.aistudio?.openSelectKey) {
             await win.aistudio.openSelectKey();
             throw new Error("API Key was invalid. Please try generating again.");
        }
    }
    throw error;
  }
};

export const generateStickerAnimation = async (
  stickerBase64: string,
  emotion: string,
  styleLabel: string
): Promise<string> => {
  await checkAndSelectApiKey();
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const cleanBase64 = stickerBase64.split(',')[1] || stickerBase64;

  const prompt = `
    Animate this ${styleLabel} character performing a "${emotion}" action.
    The animation should be cute, expressive, and loopable if possible.
    The movement should clearly represent the emotion of ${emotion}.
    IMPORTANT: Keep the background PURE FLAT WHITE (#FFFFFF). Do not change the background.
    Maintain the exact character design and art style.
  `;

  try {
    // 1. Start Video Generation
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      image: {
        imageBytes: cleanBase64,
        mimeType: 'image/png',
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '9:16', // Portrait fits character stickers better
      }
    });

    // 2. Poll for completion
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Check every 5s
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    // Check for explicit errors in the operation object
    if (operation.error) {
      console.error("Veo Operation Error:", operation.error);
      throw new Error(`Veo Error: ${operation.error.message || 'Unknown error during generation'}`);
    }

    // 3. Get Video URI
    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    
    if (!videoUri) {
      console.error("Veo Operation done but no video URI:", operation);
      throw new Error("Video generation completed but no video returned. This might be due to safety filters or service load.");
    }

    // 4. Fetch the actual bytes using the key
    const videoResponse = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
    const videoBlob = await videoResponse.blob();
    return URL.createObjectURL(videoBlob);

  } catch (error: any) {
    console.error("Veo Generation Error:", error);
    if (error.message && error.message.includes("Requested entity was not found")) {
        const win = window as any;
        if(win.aistudio?.openSelectKey) {
             await win.aistudio.openSelectKey();
             throw new Error("API Key issue. Please try again.");
        }
    }
    throw error;
  }
};