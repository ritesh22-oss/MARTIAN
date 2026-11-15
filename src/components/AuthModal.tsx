import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User as UserIcon, ArrowRight, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth, AuthModalMode } from '../context/AuthContext';
import MarsNavLogo from './MarsNavLogo';

function formatAuthError(error: any): string {
  const code = error?.code || '';
  const msg = typeof error?.message === 'string' ? error.message : '';

  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (code === 'auth/weak-password') {
    return 'Password should be at least 6 characters long.';
  }
  if (code === 'auth/invalid-email') {
    return 'Please enter a valid email address.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many failed attempts. Please wait a moment and try again.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Email/password authentication is not enabled in Firebase Console. You can sign in with Google below.';
  }
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return 'Google sign-in window was closed before completing.';
  }
  if (msg.includes('auth/unauthorized-domain') || code === 'auth/unauthorized-domain') {
    return 'This domain requires authorization in Firebase Console for Google Sign-In.';
  }
  return msg || 'Authentication failed. Please try again.';
}

export const AuthModal: React.FC = () => {
  const {
    authModalMode,
    openAuthModal,
    closeAuthModal,
    login,
    loginWithEmail,
    registerWithEmail,
    resetPassword,
  } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (authModalMode) {
      setMode(authModalMode);
      setErrorMsg(null);
      setResetSent(false);
    }
  }, [authModalMode]);

  useEffect(() => {
    if (!authModalMode) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeAuthModal();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [authModalMode, closeAuthModal]);

  if (!authModalMode) return null;

  const switchMode = (next: AuthModalMode) => {
    if (!next) return;
    setMode(next);
    openAuthModal(next);
    setErrorMsg(null);
    setResetSent(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setResetSent(false);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    if (mode === 'reset') {
      setSubmitting(true);
      try {
        await resetPassword(trimmedEmail);
        setResetSent(true);
      } catch (err: any) {
        setErrorMsg(formatAuthError(err));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    if (mode === 'signup') {
      if (!fullName.trim()) {
        setErrorMsg('Please enter your name.');
        return;
      }
      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === 'signup') {
        await registerWithEmail(trimmedEmail, password, fullName.trim());
      } else {
        await loginWithEmail(trimmedEmail, password);
      }
      closeAuthModal();
    } catch (err: any) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMsg(null);
    setGoogleSubmitting(true);
    try {
      const signedInUser = await login();
      if (signedInUser) {
        closeAuthModal();
      }
    } catch (err: any) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setGoogleSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-[#03060F]/85 backdrop-blur-md animate-fade-in font-sans"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={closeAuthModal}
    >
      <div
        className="relative w-full max-w-md bg-[#0B1020] border border-cyan-500/35 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.85)] overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 w-full bg-gradient-to-r from-cyan-400 via-blue-500 to-orange-500" />

        <button
          type="button"
          onClick={closeAuthModal}
          aria-label="Close authentication modal"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 sm:p-7 space-y-5">
          {/* Header */}
          <div className="space-y-2 text-center">
            <div className="flex justify-center">
              <MarsNavLogo variant="full" height={38} />
            </div>
            <h2 id="auth-modal-title" className="text-xl font-bold text-white tracking-tight pt-1">
              {mode === 'signin'
                ? 'Sign in to MarsNav'
                : mode === 'signup'
                  ? 'Create your MarsNav account'
                  : 'Reset your password'}
            </h2>
            <p className="text-xs text-slate-400">
              {mode === 'signin'
                ? 'Access your mission workspace, saved exploration data, and terrain tools.'
                : mode === 'signup'
                  ? 'Create an account to start exploring Mars and save your missions.'
                  : 'Enter your email address and we will send you a password reset link.'}
            </p>
          </div>

          {/* Mode Tabs (Sign In / Create Account) */}
          {mode !== 'reset' && (
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950/90 border border-slate-800 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
                  mode === 'signin'
                    ? 'bg-cyan-600/25 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-orange-600/25 text-orange-300 border border-orange-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Error / Success Messages */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {resetSent && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Password reset email sent. Check your inbox and follow the instructions.</span>
            </div>
          )}

          {/* Google Authentication */}
          {mode !== 'reset' && (
            <>
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={googleSubmitting || submitting}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-60"
              >
                {googleSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-700" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                    />
                  </svg>
                )}
                <span>Continue with Google</span>
              </button>

              <div className="relative flex items-center py-0.5">
                <div className="flex-1 border-t border-slate-800" />
                <span className="px-3 text-[10px] font-mono uppercase tracking-widest text-slate-500">
                  or with email
                </span>
                <div className="flex-1 border-t border-slate-800" />
              </div>
            </>
          )}

          {/* Email / Password Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-300 block">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    autoComplete="name"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700/80 focus:border-cyan-400 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-300 block">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700/80 focus:border-cyan-400 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>

            {mode !== 'reset' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-slate-300 block">
                    Password
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => switchMode('reset')}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'signup' ? 'At least 6 characters' : 'Enter your password'}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700/80 focus:border-cyan-400 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-300 block">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700/80 focus:border-cyan-400 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || googleSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-950/40 transition-all cursor-pointer disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>
                    {mode === 'signin'
                      ? 'Sign In'
                      : mode === 'signup'
                        ? 'Create Account'
                        : 'Send Reset Link'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {mode === 'reset' && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="text-xs text-cyan-400 hover:text-cyan-300 cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
