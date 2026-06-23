
import { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { AuthUser, Language, PlanTier } from '../types';
import { martechService } from '../services/martechService';

export const useAuth = (language: Language) => {
    const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
    const [showAuth, setShowAuth] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isPricingOpen, setIsPricingOpen] = useState(false);
    const [checkoutTier, setCheckoutTier] = useState<PlanTier | null>(null);
    const [pendingPlan, setPendingPlan] = useState<PlanTier | null>(null);

    useEffect(() => {
        authService.init();
        const user = authService.getCurrentUser();
        if (user) setCurrentUser(user);
    }, []);

    const handleLogin = (user: AuthUser) => {
        setCurrentUser(user);
        setShowAuth(false);
        setIsPricingOpen(false);
        if (pendingPlan) {
            setTimeout(() => {
                setCheckoutTier(pendingPlan);
                setPendingPlan(null);
            }, 500);
        }
    };

    const handleLogout = () => {
        martechService.trackAuth('logout');
        authService.logout();
        setCurrentUser(null);
        setIsProfileOpen(false);
    };

    const handleSelectPlan = (tier: PlanTier) => {
        if (!currentUser) {
            setPendingPlan(tier);
            setIsPricingOpen(false);
            setShowAuth(true);
        } else {
            setIsPricingOpen(false);
            setCheckoutTier(tier);
        }
    };

    const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
    const [isTermsOpen, setIsTermsOpen] = useState(false);
    const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);

    return {
        currentUser, setCurrentUser,
        showAuth, setShowAuth,
        isProfileOpen, setIsProfileOpen,
        isPricingOpen, setIsPricingOpen,
        checkoutTier, setCheckoutTier,
        handleLogin, handleLogout, handleSelectPlan,
        isPrivacyOpen, setIsPrivacyOpen,
        isTermsOpen, setIsTermsOpen,
        isGlossaryOpen, setIsGlossaryOpen,
    };
};
