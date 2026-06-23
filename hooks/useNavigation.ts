import { useState, useEffect } from 'react';
import { BlogPost, Language, TabType } from '../types';
import { martechService } from '../services/martechService';
import { blogService } from '../services/blogService';



const VALID_TABS: TabType[] = ['analyzer', 'search', 'police-ads', 'image-ai', 'video-ai', 'image-audit', 'video-audit', 'campaigns', 'brand-guardian', 'blog', 'traffic-checker', 'brand-identity', 'metrics', 'gen-ads', 'creative-lab', 'funnel-architect', 'mass-ads', 'automation-rules', 'portavoz', 'scripts', 'flow'];
const VALID_FEATURE_TABS = ['video', 'image', 'animate', 'audio', 'retail', 'master', 'ads', 'research', 'compare', 'image-audit', 'video-audit', 'portavoz', 'flow'];

// Map URLs to creative-lab featureTabs
const CREATIVE_TAB_ROUTES: Record<string, string> = {
    'animate': 'animate',
    'audio': 'audio',
    'retail': 'retail',
    'master': 'master',
    'research-hub': 'research',
    'compare-ai': 'compare',
    'portavoz-ia': 'portavoz',
};
const MODAL_PATHS = ['terms', 'privacy', 'glossary', 'pricing', 'technology', 'admin'];

function parseInitialTab(): TabType {
    const fullPath = window.location.pathname.slice(1).split('/')[0];
    if (MODAL_PATHS.includes(fullPath)) return 'analyzer';
    if (fullPath.startsWith('blog')) return 'blog';
    if (fullPath.startsWith('creative-lab')) return 'creative-lab';
    if (CREATIVE_TAB_ROUTES[fullPath]) return 'creative-lab';
    return (VALID_TABS.includes(fullPath as TabType) ? (fullPath as TabType) : 'analyzer');
}

function parseInitialFeatureTab(): string | null {
    const path = window.location.pathname.slice(1);
    if (path.startsWith('creative-lab/')) {
        const sub = path.split('/')[1];
        return VALID_FEATURE_TABS.includes(sub) ? sub : null;
    }
    const firstSegment = path.split('/')[0];
    if (CREATIVE_TAB_ROUTES[firstSegment]) {
        return CREATIVE_TAB_ROUTES[firstSegment];
    }
    return null;
}

export const useNavigation = () => {
    const [activeTab, setActiveTab] = useState<TabType>(() => parseInitialTab());
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isAdminOpen, setIsAdminOpen] = useState(false);
    const [isTechOpen, setIsTechOpen] = useState(false);
    const [selectedBlogPost, setSelectedBlogPost] = useState<BlogPost | null>(null);
    const [featureTab, setFeatureTab] = useState<string | null>(() => parseInitialFeatureTab());

    // Initial load: resolve blog slug from URL
    useEffect(() => {
        const path = window.location.pathname.slice(1);
        if (path.startsWith('blog/')) {
            const slug = path.split('/')[1];
            if (slug) {
                blogService.getPostBySlug(slug).then(post => {
                    if (post) setSelectedBlogPost(post);
                });
            }
        }
    }, []);

    useEffect(() => {
        const handleNavToBlog = (e: any) => {
            if (e.detail) setSelectedBlogPost(e.detail);
            setActiveTab('blog');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
        const handleNavToTraffic = () => {
            setActiveTab('traffic-checker');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
        const handlePopState = () => {
            const path = window.location.pathname.slice(1);

            if (path.startsWith('blog')) {
                setActiveTab('blog');
                const slug = path.split('/')[1];
                if (slug) {
                    blogService.getPostBySlug(slug).then(setSelectedBlogPost);
                } else {
                    setSelectedBlogPost(null);
                }
            } else if (path.startsWith('creative-lab')) {
                setActiveTab('creative-lab');
                const sub = path.split('/')[1];
                setFeatureTab(VALID_FEATURE_TABS.includes(sub) ? sub : null);
            } else if (CREATIVE_TAB_ROUTES[path]) {
                // Redirect creative-tab routes to creative-lab
                setActiveTab('creative-lab');
                setFeatureTab(CREATIVE_TAB_ROUTES[path]);
            } else if (path && VALID_TABS.includes(path as TabType)) {
                setActiveTab(path as TabType);
            } else if (!path || MODAL_PATHS.includes(path)) {
                setActiveTab('analyzer');
            }
        };

        window.addEventListener('nav-to-blog', handleNavToBlog);
        window.addEventListener('nav-to-traffic', handleNavToTraffic);
        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('nav-to-blog', handleNavToBlog);
            window.removeEventListener('nav-to-traffic', handleNavToTraffic);
            window.removeEventListener('popstate', handlePopState);
        };
    }, [activeTab]);

    // Sync URL when tab or featureTab changes
    useEffect(() => {
        let desiredPath: string;

        if (activeTab === 'blog') {
            desiredPath = selectedBlogPost ? `/blog/${selectedBlogPost.slug}` : '/blog';
        } else if (activeTab === 'creative-lab') {
            const sub = featureTab || 'video';
            desiredPath = `/creative-lab/${sub}`;
        } else if (MODAL_PATHS.includes(activeTab)) {
            return; // modal routes don't change the URL
        } else {
            desiredPath = activeTab === 'analyzer' ? '/' : `/${activeTab}`;
        }

        if (window.location.pathname !== desiredPath) {
            window.history.pushState({}, '', desiredPath);
        }

        martechService.trackPageView(desiredPath, `View: ${activeTab}${featureTab && activeTab === 'creative-lab' ? `/${featureTab}` : ''}`);
    }, [activeTab, featureTab, selectedBlogPost]);

    return {
        activeTab, setActiveTab,
        featureTab, setFeatureTab,
        isHistoryOpen, setIsHistoryOpen,
        isAdminOpen, setIsAdminOpen,
        isTechOpen, setIsTechOpen,
        selectedBlogPost, setSelectedBlogPost
    };
};
