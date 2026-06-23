import { aiService, trafficAnalysisService } from './ai/aiService';
import { logger } from '../utils/logger';


export const checkAIHealth = aiService.checkAIHealth;
export const auditBrandBrief = aiService.auditBrandBrief;
export const performSearch = aiService.performSearch;
export const auditAdImage = aiService.auditAdImage;
export const auditAdVideo = aiService.auditAdVideo;
export const getCampaignAudit = aiService.getCampaignAudit;
export const chatWithExpert = aiService.chatWithExpert;
export const optimizeBlogPostSEO = aiService.optimizeBlogPostSEO;
export const auditBlogPostIntelligence = aiService.auditBlogPostIntelligence;
export const generateBlogPostContent = aiService.generateBlogPostContent;
export const performTrafficCheck = trafficAnalysisService.performTrafficCheck;

// Placeholder for performCyberAudit if needed
export const performCyberAudit = aiService.fetchWithRetry ? async (target: string) => {
  logger.info("Cyber Audit Placeholder");
  return { vulnerabilityScore: 0, overallSecurityRating: 'Secure' as any, detectedThreats: [], remediationPlan: [] };
} : undefined;

export default aiService;
