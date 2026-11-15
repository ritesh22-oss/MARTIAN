import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth, ORBIT_ONBOARDING_VERSION } from './AuthContext';
import { useWorkspace } from './WorkspaceContext';
import { ORBIT_TOUR_STEPS, OrbitTourStep } from '../config/orbitTourConfig';

export type OnboardingPhase = 'idle' | 'welcome' | 'tour' | 'complete';
export type OrbitMood = 'idle' | 'speaking' | 'thinking' | 'happy' | 'celebrating';

interface OnboardingContextType {
  phase: OnboardingPhase;
  isActive: boolean;
  currentStepIndex: number;
  totalSteps: number;
  currentStep: OrbitTourStep;
  isManualReplay: boolean;
  isTransitioning: boolean;
  robotMood: OrbitMood;
  startOrientation: () => void;
  startManualTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  skipTour: () => void;
  closeTour: () => void;
  finishTour: () => void;
  completeAndExit: () => void;
  revisitTour: () => void;
  setIsTransitioning: (val: boolean) => void;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userProfile, loading: authLoading, profileSynced, updateOnboardingState } = useAuth();
  const { setActiveWorkspace, setSidebarCollapsed } = useWorkspace();

  const [phase, setPhase] = useState<OnboardingPhase>('idle');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isManualReplay, setIsManualReplay] = useState<boolean>(false);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [robotMood, setRobotMood] = useState<OrbitMood>('idle');

  // Guard against duplicate launches for the same authenticated user session
  const evaluatedUserKeyRef = useRef<string | null>(null);
  const moodTimeoutRef = useRef<number | null>(null);

  const triggerStepMoodReaction = useCallback((reaction: OrbitMood, settleTo: OrbitMood = 'speaking', durationMs = 700) => {
    if (moodTimeoutRef.current) {
      window.clearTimeout(moodTimeoutRef.current);
      moodTimeoutRef.current = null;
    }
    setRobotMood(reaction);
    moodTimeoutRef.current = window.setTimeout(() => {
      setRobotMood(settleTo);
    }, durationMs);
  }, []);

  useEffect(() => {
    return () => {
      if (moodTimeoutRef.current) {
        window.clearTimeout(moodTimeoutRef.current);
      }
    };
  }, []);

  // Reset guard if user logs out
  useEffect(() => {
    if (!user) {
      evaluatedUserKeyRef.current = null;
      setPhase('idle');
      setCurrentStepIndex(0);
      setIsManualReplay(false);
    }
  }, [user]);

  // First-time user auto-launch & interrupted mid-tour resume
  useEffect(() => {
    if (authLoading || !profileSynced || !user || !userProfile) return;

    // Guest mode sessions never auto-launch onboarding
    if ((user as any).isAnonymous || user.uid === 'guest-commander-session') {
      return;
    }

    const evalKey = `${user.uid}:${userProfile.onboarding_version || ORBIT_ONBOARDING_VERSION}`;
    if (evaluatedUserKeyRef.current === evalKey) return;
    evaluatedUserKeyRef.current = evalKey;

    if (userProfile.onboarding_completed === true || userProfile.onboarding_skipped === true) {
      return;
    }

    // Resume interrupted mid-tour step without restarting from step 1
    const savedStep = userProfile.onboarding_current_step ?? 0;
    if (savedStep >= 1 && savedStep <= ORBIT_TOUR_STEPS.length) {
      const resumeIdx = savedStep - 1;
      setIsManualReplay(false);
      setCurrentStepIndex(resumeIdx);
      setSidebarCollapsed(false);
      setPhase('tour');
      setRobotMood('speaking');
      return;
    }

    // Brand-new authenticated user: launch Welcome Screen automatically once
    setIsManualReplay(false);
    setCurrentStepIndex(0);
    setPhase('welcome');
    setRobotMood('happy');
  }, [authLoading, profileSynced, user, userProfile, setSidebarCollapsed]);

  const startOrientation = useCallback(() => {
    setSidebarCollapsed(false);
    setCurrentStepIndex(0);
    setPhase('tour');
    triggerStepMoodReaction('happy', 'speaking', 650);
    if (!isManualReplay && user && !(user as any).isAnonymous && user.uid !== 'guest-commander-session') {
      updateOnboardingState({
        onboarding_completed: false,
        onboarding_skipped: false,
        onboarding_version: ORBIT_ONBOARDING_VERSION,
        onboarding_current_step: 1,
      });
    }
  }, [isManualReplay, user, updateOnboardingState, setSidebarCollapsed, triggerStepMoodReaction]);

  const startManualTour = useCallback(() => {
    const alreadyFinished = Boolean(
      userProfile?.onboarding_completed || userProfile?.onboarding_skipped
    );
    setIsManualReplay(alreadyFinished);
    setSidebarCollapsed(false);
    setCurrentStepIndex(0);
    setPhase('tour');
    triggerStepMoodReaction('happy', 'speaking', 650);
    if (!alreadyFinished && user && !(user as any).isAnonymous && user.uid !== 'guest-commander-session') {
      updateOnboardingState({
        onboarding_completed: false,
        onboarding_skipped: false,
        onboarding_version: ORBIT_ONBOARDING_VERSION,
        onboarding_current_step: 1,
      });
    }
  }, [userProfile, user, updateOnboardingState, setSidebarCollapsed, triggerStepMoodReaction]);

  const goToStep = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(ORBIT_TOUR_STEPS.length - 1, index));
    setSidebarCollapsed(false);
    setCurrentStepIndex(clamped);
    triggerStepMoodReaction('thinking', 'speaking', 550);

    if (!isManualReplay && user && !(user as any).isAnonymous && user.uid !== 'guest-commander-session') {
      updateOnboardingState({
        onboarding_current_step: clamped + 1,
      });
    }
  }, [isManualReplay, user, updateOnboardingState, setSidebarCollapsed, triggerStepMoodReaction]);

  const finishTour = useCallback(() => {
    setPhase('complete');
    setRobotMood('celebrating');
    if (!isManualReplay && user && !(user as any).isAnonymous && user.uid !== 'guest-commander-session') {
      updateOnboardingState({
        onboarding_completed: true,
        onboarding_skipped: false,
        onboarding_version: ORBIT_ONBOARDING_VERSION,
        onboarding_completed_at: new Date().toISOString(),
        onboarding_current_step: ORBIT_TOUR_STEPS.length,
      });
    }
  }, [isManualReplay, user, updateOnboardingState]);

  const nextStep = useCallback(() => {
    if (currentStepIndex >= ORBIT_TOUR_STEPS.length - 1) {
      finishTour();
      return;
    }
    goToStep(currentStepIndex + 1);
  }, [currentStepIndex, finishTour, goToStep]);

  const prevStep = useCallback(() => {
    if (currentStepIndex <= 0) return;
    goToStep(currentStepIndex - 1);
  }, [currentStepIndex, goToStep]);

  const skipTour = useCallback(() => {
    setPhase('idle');
    setRobotMood('idle');
    if (!isManualReplay && user && !(user as any).isAnonymous && user.uid !== 'guest-commander-session') {
      updateOnboardingState({
        onboarding_completed: false,
        onboarding_skipped: true,
        onboarding_version: ORBIT_ONBOARDING_VERSION,
        onboarding_current_step: currentStepIndex + 1,
      });
    }
    setIsManualReplay(false);
  }, [isManualReplay, user, updateOnboardingState, currentStepIndex]);

  const closeTour = useCallback(() => {
    skipTour();
  }, [skipTour]);

  const completeAndExit = useCallback(() => {
    setPhase('idle');
    setRobotMood('idle');
    if (!isManualReplay && user && !(user as any).isAnonymous && user.uid !== 'guest-commander-session') {
      updateOnboardingState({
        onboarding_completed: true,
        onboarding_skipped: false,
        onboarding_version: ORBIT_ONBOARDING_VERSION,
        onboarding_completed_at: userProfile?.onboarding_completed_at || new Date().toISOString(),
        onboarding_current_step: ORBIT_TOUR_STEPS.length,
      });
    }
    setIsManualReplay(false);
    setActiveWorkspace('overview');
  }, [isManualReplay, user, userProfile?.onboarding_completed_at, updateOnboardingState, setActiveWorkspace]);

  const revisitTour = useCallback(() => {
    setIsManualReplay(true);
    setSidebarCollapsed(false);
    setCurrentStepIndex(0);
    setPhase('tour');
    triggerStepMoodReaction('happy', 'speaking', 650);
  }, [setSidebarCollapsed, triggerStepMoodReaction]);

  const currentStep = ORBIT_TOUR_STEPS[currentStepIndex] || ORBIT_TOUR_STEPS[0];

  return (
    <OnboardingContext.Provider
      value={{
        phase,
        isActive: phase !== 'idle',
        currentStepIndex,
        totalSteps: ORBIT_TOUR_STEPS.length,
        currentStep,
        isManualReplay,
        isTransitioning,
        robotMood,
        startOrientation,
        startManualTour,
        nextStep,
        prevStep,
        goToStep,
        skipTour,
        closeTour,
        finishTour,
        completeAndExit,
        revisitTour,
        setIsTransitioning,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return ctx;
}
