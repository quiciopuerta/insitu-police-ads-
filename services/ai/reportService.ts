import { buildAbsoluteUrl } from "../../utils/apiConfig";

import { Language } from '../../types';
import { logger } from '../../utils/logger';

import { authService } from '../auth/authService';

interface SendReportPayload {
  email: string;
  pdfBase64: string;
  fileName: string;
  domain?: string;
  reportType: string;
  language?: Language;
}

export const reportService = {
  /**
   * Sends a PDF report via email calling the Netlify function.
   */
  sendReport: async (payload: SendReportPayload): Promise<{ success: boolean; message: string }> => {
    try {
      const userId = authService.getCurrentUser()?.id || '';
      
      const response = await fetch(buildAbsoluteUrl('/.netlify/functions/api-send-report'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userId ? { 'X-User-Id': userId } : {})
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      return {
        success: true,
        message: data.message || 'Email sent successfully',
      };
    } catch (error: any) {
      logger.error('[reportService] Error sending report:', error);
      return {
        success: false,
        message: error.message || 'Unknown error occurred',
      };
    }
  },
};
