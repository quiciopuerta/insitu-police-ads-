/**
 * Client-side Media Compression Utility
 * =====================================
 * Reduces payload size and token consumption before sending to Gemini Vision.
 */

export const compressImage = async (base64Str: string, maxWidth = 1024, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Ensure the src is a valid data URL (add prefix if missing)
    const src = base64Str.startsWith('data:')
      ? base64Str
      : `data:image/jpeg;base64,${base64Str}`;
    img.src = src;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context failed'));

      ctx.drawImage(img, 0, 0, width, height);

      // Return only the base64 part (strip data URL prefix)
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(dataUrl.split(',')[1]);
    };
    img.onerror = () => reject(new Error('Image compression failed: could not load image'));
  });
};

/**
 * For videos, we only compress the frame being sent for analysis.
 * The full video upload is typically handled by a storage service or remains local for frame capture.
 */
export const compressFrame = async (canvas: HTMLCanvasElement, quality = 0.6): Promise<string> => {
   return canvas.toDataURL('image/jpeg', quality);
};
