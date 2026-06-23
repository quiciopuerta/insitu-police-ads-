
import { lazy } from 'react';

// Helper to handle ChunkLoadError / failed dynamic import due to new Netlify deployments replacing assets
const lazyWithRetry = (importFn: () => Promise<any>) => {
  return lazy(async () => {
    try {
      const component = await importFn();
      // If load succeeds, clear the reload key
      sessionStorage.removeItem("chunk_load_retry_active");
      return component;
    } catch (error) {
      console.error("Failed to fetch dynamically imported module, forcing page reload:", error);
      const isRetryActive = sessionStorage.getItem("chunk_load_retry_active");
      if (!isRetryActive) {
        sessionStorage.setItem("chunk_load_retry_active", "true");
        window.location.reload();
        // Return a dummy promise that never resolves while page is reloading
        return new Promise(() => {});
      }
      sessionStorage.removeItem("chunk_load_retry_active");
      throw error;
    }
  });
};

export const AdsOptimizerView = lazyWithRetry(() => import('./AdsOptimizerView'));
export const ImageAuditView = lazyWithRetry(() => import('./ImageAuditView'));
export const VideoAuditView = lazyWithRetry(() => import('./VideoAuditView'));
export const BrandIdentity = lazyWithRetry(() => import('./BrandIdentity'));
export const AdminDashboard = lazyWithRetry(() => import('./AdminDashboard'));
export const ProfileView = lazyWithRetry(() => import('./ProfileView'));
export const TechnologyPage = lazyWithRetry(() => import('./TechnologyPage'));
export const PricingPage = lazyWithRetry(() => import('./PricingPage'));
export const HistoryPanel = lazyWithRetry(() => import('./HistoryPanel'));
export const BlogView = lazyWithRetry(() => import('./BlogView'));
export const TrafficChecker = lazyWithRetry(() => import('./TrafficChecker'));
export const PrivacyPolicy = lazyWithRetry(() => import('./PrivacyPolicy'));
export const SupportPage = lazyWithRetry(() => import('./SupportPage'));
export const PaymentModal = lazyWithRetry(() => import('./PaymentModal'));
export const CompareCreativesView = lazyWithRetry(() => import('./CompareCreativesView'));
export const GlossaryView = lazyWithRetry(() => import('./GlossaryView'));
export const MetricsView = lazyWithRetry(() => import('./MetricsView'));
export const TermsOfService = lazyWithRetry(() => import('./TermsOfService'));
export const SecurityPage = lazyWithRetry(() => import('./SecurityPage'));
export const ContactPage = lazyWithRetry(() => import('./ContactPage'));
export const ResultSkeleton = lazyWithRetry(() => import("./ui/ResultSkeleton"));
export const LandingPage = lazyWithRetry(() => import('./LandingPage'));
export const CommandCenterHome = lazyWithRetry(() => import('./CommandCenterHome'));
export const ResultCard = lazyWithRetry(() => import('./ResultCard'));
export const Header = lazyWithRetry(() => import('./Header'));
export const Sidebar = lazyWithRetry(() => import('./Sidebar'));
export const Footer = lazyWithRetry(() => import('./Footer'));
export const SearchInterface = lazyWithRetry(() => import('./SearchInterface'));
export const ExpertAgent = lazyWithRetry(() => import('./ExpertAgent'));
export const AuthGate = lazyWithRetry(() => import('./AuthGate'));
export const CreativeLabView = lazyWithRetry(() => import('./CreativeLabView'));
export const GenAdsView = lazyWithRetry(() => import('./GenAdsView'));
export const ResearchHub = lazyWithRetry(() => import('./ResearchHub'));
export const MediaEditorView = lazyWithRetry(() => import('./MediaEditorView'));
export const FunnelArchitectView = lazyWithRetry(() => import('./FunnelArchitectView'));
export const MassAdsView = lazyWithRetry(() => import('./MassAdsView'));
export const AutomationRulesView = lazyWithRetry(() => import('./AutomationRulesView'));
export const PortavozIAView = lazyWithRetry(() => import('./PortavozIAView'));
export const FlowWorkspace = lazyWithRetry(() => import('./FlowWorkspace'));
export const ScriptGeneratorView = lazyWithRetry(() => import('./ScriptGeneratorView'));
export const PoliceAdsDashboard = lazyWithRetry(() => import('./PoliceAds/PoliceAdsDashboard'));
