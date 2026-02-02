import JSZip from 'jszip';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { AnimationEffect, ProcessedSticker } from '../types';

/**
 * Flood fill algorithm to make white background transparent.
 * Enhanced to sample background color and remove edge halos.
 */
const removeBackgroundFloodFill = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  tolerance: number = 50
) => {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const visited = new Uint8Array(width * height);
  const queue: [number, number][] = [];

  // 1. Determine Background Color (Sample corners)
  const corners = [[0,0], [width-1, 0], [0, height-1], [width-1, height-1]];
  let bgR = 0, bgG = 0, bgB = 0;
  let count = 0;
  
  for(const [cx, cy] of corners) {
      const idx = (cy * width + cx) * 4;
      bgR += data[idx];
      bgG += data[idx+1];
      bgB += data[idx+2];
      count++;
      // Seed queue with corners
      queue.push([cx, cy]); 
  }
  bgR = Math.round(bgR / count);
  bgG = Math.round(bgG / count);
  bgB = Math.round(bgB / count);

  // Safety: If calculated bg is too dark, assume pure white (safety fallback for dark mode stickers)
  // Usually AI output is light/white background.
  if (bgR < 200 || bgG < 200 || bgB < 200) {
      bgR = 255; bgG = 255; bgB = 255;
  }

  const getPixelIndex = (x: number, y: number) => (y * width + x) * 4;

  const isBackgroundish = (r: number, g: number, b: number) => {
    return Math.abs(r - bgR) < tolerance && 
           Math.abs(g - bgG) < tolerance && 
           Math.abs(b - bgB) < tolerance;
  };

  // 2. Flood Fill Transparency
  while (queue.length > 0) {
    const [x, y] = queue.pop()!;
    const idx = getPixelIndex(x, y);

    if (visited[y * width + x]) continue;
    visited[y * width + x] = 1;

    if (isBackgroundish(data[idx], data[idx+1], data[idx+2])) {
      data[idx + 3] = 0; // Make transparent

      // Add neighbors
      if (x > 0) queue.push([x - 1, y]);
      if (x < width - 1) queue.push([x + 1, y]);
      if (y > 0) queue.push([x, y - 1]);
      if (y < height - 1) queue.push([x, y + 1]);
    }
  }

  // 3. Halo Removal (Simple Erosion)
  // Iterate pixels. If an opaque pixel touches a transparent one (visited=1) 
  // AND is still quite light (close to background), remove it.
  // This eats away the semi-transparent/aliased edge that causes white outlines.
  
  // We use a secondary pass to avoid cascading erasure in one loop
  const toRemove: number[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
       const idx = getPixelIndex(x, y);
       if (data[idx+3] !== 0) { // Currently opaque
           // Check 4-connectivity for transparency
           let touchesTransparent = false;
           // We use 'visited' array which marks background pixels
           if (x > 0 && visited[y*width + (x-1)]) touchesTransparent = true;
           else if (x < width - 1 && visited[y*width + (x+1)]) touchesTransparent = true;
           else if (y > 0 && visited[(y-1)*width + x]) touchesTransparent = true;
           else if (y < height - 1 && visited[(y+1)*width + x]) touchesTransparent = true;
           
           if (touchesTransparent) {
               // It's an edge pixel. Is it light?
               // Use slightly stricter tolerance for edge cleaning to preserve light colored clothes
               if (isBackgroundish(data[idx], data[idx+1], data[idx+2])) {
                   toRemove.push(idx);
               }
           }
       }
    }
  }

  for (const idx of toRemove) {
    data[idx + 3] = 0;
  }

  ctx.putImageData(imageData, 0, 0);
};

/**
 * Processes the full generated sheet to remove background.
 * Used for the "Download Image" button.
 */
export const processImageForDownload = async (base64Image: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = base64Image;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        reject(new Error("No context"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      removeBackgroundFloodFill(ctx, canvas.width, canvas.height, 60); // Higher tolerance for full sheet
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
  });
};

/**
 * Analyzes the sheet, cuts stickers, removes background, and resizes to 240x240.
 */
export const extractStickers = async (
  base64Image: string
): Promise<ProcessedSticker[]> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = base64Image;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error("Could not get canvas context");

        ctx.drawImage(img, 0, 0);
        
        // 1. Identification logic (Projection Profile)
        const { width, height } = canvas;
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Threshold to determine if a pixel is "Content" vs "Background" for Cutting purposes
        // We use a safe threshold (230) to find the bounding boxes
        const isContent = (x: number, y: number) => {
          const idx = (y * width + x) * 4;
          return data[idx] < 230 || data[idx + 1] < 230 || data[idx + 2] < 230;
        };

        // Scan Y to find rows
        const rowHasContent = new Array(height).fill(false);
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            if (isContent(x, y)) {
              rowHasContent[y] = true;
              break;
            }
          }
        }

        const rowRanges: [number, number][] = [];
        let inRow = false;
        let startY = 0;
        for (let y = 0; y < height; y++) {
          if (rowHasContent[y] && !inRow) {
            inRow = true;
            startY = y;
          } else if (!rowHasContent[y] && inRow) {
            inRow = false;
            if (y - startY > 10) rowRanges.push([startY, y]);
          }
        }
        if (inRow) rowRanges.push([startY, height]);

        // Scan X within rows to find columns
        const regions: { x: number, y: number, w: number, h: number }[] = [];
        for (const [rStart, rEnd] of rowRanges) {
          const colHasContent = new Array(width).fill(false);
          for (let x = 0; x < width; x++) {
            for (let y = rStart; y < rEnd; y++) {
              if (isContent(x, y)) {
                colHasContent[x] = true;
                break;
              }
            }
          }
          let inCol = false;
          let startX = 0;
          for (let x = 0; x < width; x++) {
            if (colHasContent[x] && !inCol) {
              inCol = true;
              startX = x;
            } else if (!colHasContent[x] && inCol) {
              inCol = false;
              if (x - startX > 10) {
                regions.push({ x: startX, y: rStart, w: x - startX, h: rEnd - rStart });
              }
            }
          }
          if (inCol) regions.push({ x: startX, y: rStart, w: width - startX, h: rEnd - rStart });
        }

        // 2. Process each region
        const stickers: ProcessedSticker[] = regions.map((rect, index) => {
          // Cut to temp canvas
          const tempC = document.createElement('canvas');
          tempC.width = rect.w;
          tempC.height = rect.h;
          const tempCtx = tempC.getContext('2d', { willReadFrequently: true })!;
          tempCtx.drawImage(canvas, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);

          // Remove Background (Flood Fill) with High Robustness
          removeBackgroundFloodFill(tempCtx, rect.w, rect.h, 60);

          // Resize to 240x240 (Contain)
          const finalC = document.createElement('canvas');
          finalC.width = 240;
          finalC.height = 240;
          const finalCtx = finalC.getContext('2d')!;

          // Calculate scaling to fit
          const scale = Math.min(220 / rect.w, 220 / rect.h); // Leave 10px padding
          const drawW = rect.w * scale;
          const drawH = rect.h * scale;
          const offsetX = (240 - drawW) / 2;
          const offsetY = (240 - drawH) / 2;

          finalCtx.drawImage(tempC, 0, 0, rect.w, rect.h, offsetX, offsetY, drawW, drawH);

          return {
            id: `sticker_${index}`,
            src: finalC.toDataURL('image/png')
          };
        });

        resolve(stickers);

      } catch (e) {
        reject(e);
      }
    };
    img.onerror = reject;
  });
};

export const createZipFromStickers = async (stickers: ProcessedSticker[], prefix: string): Promise<Blob> => {
  const zip = new JSZip();
  
  for (const s of stickers) {
    const data = s.src.split(',')[1];
    // Naming convention for easy sorting
    zip.file(`${prefix}_${s.id}_240x240.png`, data, { base64: true });
  }
  
  return zip.generateAsync({ type: 'blob' });
};

/**
 * Generate an animated GIF from a single static sticker
 * Updated: Supports transparency using color-keying
 */
export const createStickerGif = async (
  stickerSrc: string,
  effect: AnimationEffect
): Promise<Blob> => {
  if (effect === 'none') {
    return (await fetch(stickerSrc)).blob();
  }

  if (!GIFEncoder || !quantize || !applyPalette) {
    throw new Error("GIF Encoder not initialized");
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = stickerSrc;
    img.onload = () => {
      const width = 240;
      const height = 240;
      
      const gif = new GIFEncoder();
      const frames = 16; 
      const delay = 60; 

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

      const TRANSPARENT_COLOR = [0, 255, 0]; // Bright Green Key

      for (let i = 0; i < frames; i++) {
        // Clear with "Green Screen" color for transparency detection later
        // Note: For client-side GIF encoding, we use a key color because alpha quantization is tricky
        ctx.fillStyle = `rgb(${TRANSPARENT_COLOR.join(',')})`;
        ctx.fillRect(0, 0, width, height);
        
        ctx.save();
        ctx.translate(width / 2, height / 2);

        const t = i / frames; 
        const rad = t * Math.PI * 2;

        if (effect === 'shake') {
          const offset = Math.sin(rad * 3) * 10;
          ctx.translate(offset, 0);
        } else if (effect === 'bounce') {
          const offset = Math.abs(Math.sin(rad * 2)) * -15 + 15;
          ctx.translate(0, offset - 7);
        } else if (effect === 'pulse') {
          const s = 1 + Math.sin(rad * 2) * 0.1;
          ctx.scale(s, s);
        } else if (effect === 'spin') {
           ctx.rotate(rad);
        } else if (effect === 'wobble') {
           ctx.rotate(Math.sin(rad * 2) * 0.15);
        }

        ctx.drawImage(img, -width / 2, -height / 2);
        ctx.restore();

        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        // Pre-processing: Ensure transparent pixels from source image are mapped to Green Screen
        for (let j = 0; j < data.length; j += 4) {
           if (data[j+3] < 128) {
               data[j] = TRANSPARENT_COLOR[0];
               data[j+1] = TRANSPARENT_COLOR[1];
               data[j+2] = TRANSPARENT_COLOR[2];
               data[j+3] = 255;
           }
        }
        
        const palette = quantize(data, 256);
        let transIndex = -1;
        // Find our key color in palette
        for (let p = 0; p < palette.length; p++) {
          if (Math.abs(palette[p][0] - TRANSPARENT_COLOR[0]) < 5 && 
              Math.abs(palette[p][1] - TRANSPARENT_COLOR[1]) < 5 && 
              Math.abs(palette[p][2] - TRANSPARENT_COLOR[2]) < 5) {
            transIndex = p;
            break;
          }
        }

        const index = applyPalette(data, palette);
        gif.writeFrame(index, width, height, { 
          palette, 
          delay,
          transparent: transIndex !== -1 ? transIndex : undefined
        });
      }

      gif.finish();
      resolve(new Blob([gif.bytes()], { type: 'image/gif' }));
    };
  });
};

/**
 * Converts an MP4 video (blob URL) to a GIF.
 */
export const convertVideoToGif = async (videoUrl: string): Promise<Blob> => {
  if (!GIFEncoder) throw new Error("GIF Encoder not initialized");

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.src = videoUrl;
    video.muted = true;
    video.play().catch(e => console.log("Auto-play prevented", e));

    video.onloadeddata = async () => {
      video.currentTime = 0;
      
      const width = 240;
      const height = 240;
      const gif = new GIFEncoder();
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      
      const duration = Math.min(2.5, video.duration || 2.5); 
      const fps = 10;
      const totalFrames = Math.floor(duration * fps);
      const delay = 1000 / fps;

      for (let i = 0; i < totalFrames; i++) {
        const time = i / fps;
        video.currentTime = time;
        
        await new Promise<void>(r => {
          const onSeek = () => {
            video.removeEventListener('seeked', onSeek);
            r();
          };
          video.addEventListener('seeked', onSeek);
        });

        // Use white background for AI video conversion frames
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        
        const vW = video.videoWidth;
        const vH = video.videoHeight;
        
        const scale = Math.max(width / vW, height / vH) * 1.2; 
        const dw = vW * scale;
        const dh = vH * scale;
        const dx = (width - dw) / 2;
        const dy = (height - dh) / 2;

        ctx.drawImage(video, dx, dy, dw, dh);

        const imageData = ctx.getImageData(0, 0, width, height);
        const palette = quantize(imageData.data, 256);
        const index = applyPalette(imageData.data, palette);

        gif.writeFrame(index, width, height, {
          palette,
          delay,
        });
      }

      gif.finish();
      resolve(new Blob([gif.bytes()], { type: 'image/gif' }));
    };

    video.onerror = (e) => reject(e);
  });
};