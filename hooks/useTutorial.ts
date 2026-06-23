import { useState, useEffect, useCallback } from 'react';
import { Language } from '../types';
import { TUTORIAL_REGISTRY, LocalizedTutorialStep } from '../constants/tutorialSteps';

export type TutorialModuleKey =
  | 'flow-workspace'
  | 'search-interface'
  | 'image-audit'
  | 'video-audit'
  | 'budget-simulator'
  | 'campaigns'
  | 'research-hub'
  | 'portavoz'
  | 'mass-ads';

const STORAGE_PREFIX = 'insitu_tutorial_done_';

export interface UseTutorialReturn {
  /** Steps already localized to the current language */
  steps: LocalizedTutorialStep[];
  /** Index of the currently visible step */
  currentStep: number;
  /** Whether the tutorial overlay is visible */
  isVisible: boolean;
  /** Whether the user has permanently dismissed this module's tutorial */
  isDismissed: boolean;
  /** Navigate to next step (auto-dismisses on last step) */
  next: () => void;
  /** Navigate to previous step */
  prev: () => void;
  /** Jump to a specific step index */
  goTo: (index: number) => void;
  /** Permanently dismiss the tutorial for this module */
  dismiss: () => void;
  /** Re-show tutorial (resets dismissed state) */
  restart: () => void;
}

/**
 * useTutorial — manages per-module tutorial bubble state
 *
 * @param moduleKey   - unique key matching TUTORIAL_REGISTRY
 * @param language    - current app language ('es' | 'en')
 * @param autoShow    - whether to auto-show on mount if not dismissed (default: true)
 * @param delay       - delay in ms before auto-show (default: 800)
 */
export function useTutorial(
  moduleKey: TutorialModuleKey,
  language: Language,
  autoShow = true,
  delay = 800,
): UseTutorialReturn {
  const storageKey = `${STORAGE_PREFIX}${moduleKey}`;

  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(storageKey) === 'true';
    } catch {
      return false;
    }
  });

  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Localize steps to current language
  const rawSteps = TUTORIAL_REGISTRY[moduleKey] ?? [];
  const steps: LocalizedTutorialStep[] = rawSteps.map((s) => ({
    id: s.id,
    title: s[language].title,
    body: s[language].body,
    position: s.position,
    arrowDirection: s.arrowDirection,
  }));

  // Auto-show on first visit
  useEffect(() => {
    if (!autoShow || isDismissed || steps.length === 0) return;
    const timer = setTimeout(() => {
      setIsVisible(true);
      setCurrentStep(0);
    }, delay);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = useCallback(() => {
    setIsVisible(false);
    setIsDismissed(true);
    try {
      localStorage.setItem(storageKey, 'true');
    } catch {}
  }, [storageKey]);

  const restart = useCallback(() => {
    setCurrentStep(0);
    setIsVisible(true);
    setIsDismissed(false);
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  }, [storageKey]);

  const next = useCallback(() => {
    setCurrentStep((s) => {
      if (s >= steps.length - 1) {
        dismiss();
        return s;
      }
      return s + 1;
    });
  }, [steps.length, dismiss]);

  const prev = useCallback(() => {
    setCurrentStep((s) => Math.max(0, s - 1));
  }, []);

  const goTo = useCallback((index: number) => {
    setCurrentStep(Math.max(0, Math.min(index, steps.length - 1)));
  }, [steps.length]);

  return { steps, currentStep, isVisible, isDismissed, next, prev, goTo, dismiss, restart };
}
