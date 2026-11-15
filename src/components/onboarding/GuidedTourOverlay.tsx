import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useOnboarding } from '../../context/OnboardingContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { OrbitWelcomeScreen } from './OrbitWelcomeScreen';
import { GuidedTourSpotlight } from './GuidedTourSpotlight';
import { OrbitDialogue } from './OrbitDialogue';
import { TourCompletionScreen } from './TourCompletionScreen';

export const GuidedTourOverlay: React.FC = () => {
  const {
    phase,
    isActive,
    currentStepIndex,
    totalSteps,
    currentStep,
    isTransitioning,
    robotMood,
    startOrientation,
    nextStep,
    prevStep,
    skipTour,
    closeTour,
    completeAndExit,
    revisitTour,
    setIsTransitioning,
  } = useOnboarding();

  const { setActiveWorkspace, setSidebarCollapsed } = useWorkspace();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const rafRef = useRef<number | null>(null);

  const measureTarget = useCallback(() => {
    if (phase !== 'tour') {
      setTargetRect(null);
      return;
    }
    const selector = `[data-tour-nav="${currentStep.workspaceId}"]`;
    const el = document.querySelector(selector) as HTMLElement | null;
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setTargetRect(rect);
      }
    }
  }, [phase, currentStep.workspaceId]);

  // Lock background page scroll while any onboarding overlay is visible
  useEffect(() => {
    if (!isActive) return;
    const prevBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const mainEl = document.querySelector('main[data-marsnav-main="true"]') as HTMLElement | null;
    const prevMainOverflow = mainEl ? mainEl.style.overflow : '';
    if (mainEl) {
      mainEl.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      if (mainEl) {
        mainEl.style.overflow = prevMainOverflow;
      }
    };
  }, [isActive]);

  // Synchronize step navigation -> sidebar visibility -> render readiness -> spotlight rect
  useEffect(() => {
    if (phase !== 'tour') {
      setTargetRect(null);
      setIsTransitioning(false);
      return;
    }

    let cancelled = false;
    setIsTransitioning(true);
    setSidebarCollapsed(false);
    setActiveWorkspace(currentStep.workspaceId);

    const locateAndRevealTarget = () => {
      if (cancelled) return;

      const navEl = document.querySelector(
        `[data-tour-nav="${currentStep.workspaceId}"]`
      ) as HTMLElement | null;
      const workspaceEl = document.querySelector(
        `[data-active-workspace="${currentStep.workspaceId}"]`
      ) as HTMLElement | null;

      if (navEl) {
        // Scroll highlighted sidebar navigation item cleanly into view
        navEl.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
        const rect = navEl.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setTargetRect(rect);
        }
      }

      if (navEl && workspaceEl) {
        // Wait one animation frame after both sidebar item & workspace container render
        rafRef.current = window.requestAnimationFrame(() => {
          if (cancelled) return;
          measureTarget();
          setIsTransitioning(false);
        });
        return true;
      }

      return false;
    };

    const initialReady = locateAndRevealTarget();
    let observer: MutationObserver | null = null;
    let settleTimer: number | null = null;
    let fallbackTimer: number | null = null;

    if (!initialReady) {
      observer = new MutationObserver(() => {
        if (locateAndRevealTarget() && observer) {
          observer.disconnect();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    }

    // Re-measure after smooth scroll settles
    settleTimer = window.setTimeout(() => {
      if (!cancelled) {
        measureTarget();
      }
    }, 240);

    // Safety readiness cap so transitions never stall if an element renders slowly
    fallbackTimer = window.setTimeout(() => {
      if (!cancelled) {
        measureTarget();
        setIsTransitioning(false);
      }
    }, 550);

    return () => {
      cancelled = true;
      if (observer) observer.disconnect();
      if (settleTimer) window.clearTimeout(settleTimer);
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, [phase, currentStep.workspaceId, setActiveWorkspace, setSidebarCollapsed, setIsTransitioning, measureTarget]);

  // Continuously align spotlight cutout on sidebar scroll, window resize, and element resize
  useEffect(() => {
    if (phase !== 'tour') return;

    const handleReposition = () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = window.requestAnimationFrame(() => {
        measureTarget();
      });
    };

    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    const navEl = document.querySelector(
      `[data-tour-nav="${currentStep.workspaceId}"]`
    ) as HTMLElement | null;
    const asideEl = document.querySelector('aside[data-marsnav-sidebar="true"]') as HTMLElement | null;

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(handleReposition);
      if (navEl) ro.observe(navEl);
      if (asideEl) ro.observe(asideEl);
    }

    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
      if (ro) ro.disconnect();
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, [phase, currentStep.workspaceId, measureTarget]);

  // Keyboard navigation during active guided tour
  useEffect(() => {
    if (phase !== 'tour') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        closeTour();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextStep();
      } else if (e.key === 'ArrowLeft' && currentStepIndex > 0) {
        e.preventDefault();
        prevStep();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, currentStepIndex, closeTour, nextStep, prevStep]);

  if (phase === 'idle') return null;

  if (phase === 'welcome') {
    return <OrbitWelcomeScreen onStart={startOrientation} onSkip={skipTour} />;
  }

  if (phase === 'complete') {
    return (
      <TourCompletionScreen
        onStartExploring={completeAndExit}
        onRevisitGuide={revisitTour}
      />
    );
  }

  return (
    <>
      <GuidedTourSpotlight targetRect={targetRect} />
      <OrbitDialogue
        step={currentStep}
        currentStepIndex={currentStepIndex}
        totalSteps={totalSteps}
        targetRect={targetRect}
        robotMood={robotMood}
        isTransitioning={isTransitioning}
        onPrev={prevStep}
        onNext={nextStep}
        onSkip={skipTour}
        onClose={closeTour}
      />
    </>
  );
};

export default GuidedTourOverlay;
