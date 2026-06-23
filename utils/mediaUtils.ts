/**
 * Utility to handle media-related operations.
 */

/**
 * Converts a Google Drive sharing link into a direct link that can be used as an img src.
 * Supports various Google Drive URL formats.
 * 
 * @param url The original Google Drive URL
 * @returns A direct link if it's a Google Drive URL, otherwise the original URL
 */
export const convertGoogleDriveLink = (url: string): string => {
    if (!url) return url;

    // Pattern for: https://drive.google.com/file/d/FILE_ID/view...
    const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
        return `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}`;
    }

    // Pattern for: https://drive.google.com/open?id=FILE_ID
    const openIdMatch = url.match(/id=([a-zA-Z0-9_-]+)/);
    if (url.includes('drive.google.com/open') && openIdMatch && openIdMatch[1]) {
        return `https://drive.google.com/uc?export=view&id=${openIdMatch[1]}`;
    }

    // Pattern for: https://drive.google.com/uc?id=FILE_ID...
    if (url.includes('drive.google.com/uc') && openIdMatch && openIdMatch[1]) {
        return `https://drive.google.com/uc?export=view&id=${openIdMatch[1]}`;
    }

    return url;
};
