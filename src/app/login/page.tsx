'use client';
 
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Sparkles, User, HelpCircle, ChevronRight } from 'lucide-react';
import { supabaseClient } from '@/lib/supabaseClient';
import { useTheme } from '@/lib/ThemeProvider';
 
export default function LoginPage() {
  const router = useRouter();
  const { preloadUserSession, showAlert } = useTheme();
  
  // Tabs toggle
  const [isSignUp, setIsSignUp] = useState(false);
 
  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRole, setSelectedRole] = useState<'Admin' | 'Pricing Analyst' | 'Manager' | 'Viewer'>('Pricing Analyst');
 
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
 
    setLoading(true);
    setError('');
 
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, isGoogleOAuth: false })
      });
 
      const data = await res.json();
      if (res.ok && data.success) {
        await preloadUserSession();
        router.push('/home');
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };
 
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please supply name, email, and password.');
      return;
    }
 
    setLoading(true);
    setError('');
 
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role: selectedRole })
      });
 
      const data = await res.json();
      if (res.ok && data.success) {
        showAlert('Account Created', 'Account created successfully! Directing you to the home page...', 'success');
        await preloadUserSession();
        router.push('/home');
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError('Registration failed. Please make sure database is connected.');
    } finally {
      setLoading(false);
    }
  };
 
  const handleGoogleLogin = async () => {
    if (!supabaseClient) {
      setError('Database Connection Missing: Define NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment variables to use Google OAuth.');
      return;
    }
    setLoading(true);
    setError('');
 
    try {
      const { error: oauthError } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth-callback`
        }
      });
      if (oauthError) {
        setError(oauthError.message);
      }
    } catch (err) {
      setError('Google authentication redirect failed.');
    } finally {
      setLoading(false);
    }
  };
 
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#eef2f7] p-4 font-sans select-none">
      
      {/* Version badge */}
      <div className="absolute top-8 right-8">
        <span className="text-[10px] tracking-widest text-indigo-600 font-bold uppercase bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
          PricePilot v1.2
        </span>
      </div>
 
      {/* Sliding Auth Card Wrapper */}
      <div className="w-full max-w-4xl h-[620px] bg-white rounded-[2.5rem] shadow-2xl relative overflow-hidden flex">
        
        {/* ==========================================
            SLIDING OVERLAY PANEL (Purple overlay)
            ========================================== */}
        <div 
          className={`absolute top-0 bottom-0 z-30 w-1/2 h-full bg-gradient-to-br from-[#4f3bbf] via-[#5c46d2] to-[#6d55e4] text-white hidden md:flex flex-col items-center justify-center p-12 text-center transition-all duration-450 ease-in-out ${
            isSignUp 
              ? 'left-0 rounded-l-[2.5rem] rounded-r-[160px]' 
              : 'left-1/2 rounded-r-[2.5rem] rounded-l-[160px]'
          }`}
        >
          {isSignUp ? (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="text-3xl font-extrabold tracking-tight" style={{ color: '#ffffff' }}>Welcome Back!</div>
              <p className="text-sm text-indigo-100/90 leading-relaxed font-medium">
                Enter your personal details to use all of site features
              </p>
              <button
                onClick={() => { setIsSignUp(false); setError(''); }}
                className="mt-4 px-10 py-3 border-2 border-white rounded-full text-xs font-bold uppercase tracking-wider hover:bg-white hover:text-[#4f3bbf] transition-all duration-300 active:scale-95 cursor-pointer"
              >
                Sign In
              </button>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="text-3xl font-extrabold tracking-tight" style={{ color: '#ffffff' }}>Hello, Friend!</div>
              <p className="text-sm text-indigo-100/90 leading-relaxed font-medium">
                Register with your personal details to use all of site features
              </p>
              <button
                onClick={() => { setIsSignUp(true); setError(''); }}
                className="mt-4 px-10 py-3 border-2 border-white rounded-full text-xs font-bold uppercase tracking-wider hover:bg-white hover:text-[#4f3bbf] transition-all duration-300 active:scale-95 cursor-pointer"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
 
        {/* ==========================================
            FORM CONTAINER (LEFT SIDE: SIGN IN)
            ========================================== */}
        <div className={`w-full md:w-1/2 h-full flex flex-col justify-center items-center p-8 md:p-12 text-center z-10 ${
          isSignUp ? 'hidden md:flex' : 'flex'
        }`}>
          <div className="w-full max-w-sm space-y-5">
            {/* Logo */}
            <div className="flex justify-center pb-2">
              <img src="/logo.png" alt="PricePilot" className="h-20 w-auto object-contain" />
            </div>
 
            <div className="space-y-1">
              <h2 className="text-2xl font-black tracking-tight text-slate-800">Sign In to Dashboard</h2>
              <p className="text-xs text-slate-400">or use your email password credentials</p>
            </div>
 
            {error && !isSignUp && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs text-left">
                {error}
              </div>
            )}
 
            {/* Google Login Button */}
            <div className="flex justify-center w-full">
              <button 
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-full border border-slate-200 hover:bg-slate-55 hover:bg-slate-50 text-slate-600 text-xs font-bold shadow-sm transition-colors cursor-pointer"
                title="Sign in with Google"
              >
                <img src="/img/google.png" alt="Google" className="w-4 h-4 object-contain" />
                <span>Sign in with Google</span>
              </button>
            </div>
 
            {/* Clean line divider */}
            <div className="relative flex py-2 items-center justify-center w-full">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-4 text-slate-400 text-xs font-semibold select-none">or</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>
 
            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-3.5 text-left">
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 text-xs focus:border-indigo-500 focus:outline-none transition-colors"
                />
              </div>
 
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 text-xs focus:border-indigo-500 focus:outline-none transition-colors"
                />
              </div>
 
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[#4f3bbf] hover:bg-[#4331a8] text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-lg shadow-indigo-600/10 disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
 
            {/* Mobile-only toggle */}
            <button
              type="button"
              onClick={() => { setIsSignUp(true); setError(''); }}
              className="block md:hidden text-xs text-[#4f3bbf] font-bold mt-4 cursor-pointer hover:underline mx-auto"
            >
              Don't have an account? Sign Up
            </button>
          </div>
        </div>
 
        {/* ==========================================
            FORM CONTAINER (RIGHT SIDE: SIGN UP)
            ========================================== */}
        <div className={`w-full md:w-1/2 h-full flex flex-col justify-center items-center p-8 md:p-12 text-center z-10 ${
          isSignUp ? 'flex' : 'hidden md:flex'
        }`}>
          <div className="w-full max-w-sm space-y-5">
            {/* Logo */}
            <div className="flex justify-center pb-2">
              <img src="/logo.png" alt="PricePilot" className="h-20 w-auto object-contain" />
            </div>
 
            <div className="space-y-1">
              <h2 className="text-2xl font-black tracking-tight text-slate-800">Create Account</h2>
              <p className="text-xs text-slate-400">or use your email for registration</p>
            </div>
 
            {error && isSignUp && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs text-left">
                {error}
              </div>
            )}
 
            {/* Google Signup Button */}
            <div className="flex justify-center w-full">
              <button 
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-full border border-slate-200 hover:bg-slate-55 hover:bg-slate-50 text-slate-600 text-xs font-bold shadow-sm transition-colors cursor-pointer"
                title="Sign up with Google"
              >
                <img src="/img/google.png" alt="Google" className="w-4 h-4 object-contain" />
                <span>Sign up with Google</span>
              </button>
            </div>
 
            {/* Clean line divider */}
            <div className="relative flex py-2 items-center justify-center w-full">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-4 text-slate-400 text-xs font-semibold select-none">or</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>
 
            {/* Form */}
            <form onSubmit={handleRegister} className="space-y-3 text-left">
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 text-xs focus:border-indigo-500 focus:outline-none transition-colors"
                />
              </div>
 
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 text-xs focus:border-indigo-500 focus:outline-none transition-colors"
                />
              </div>
 
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 text-xs focus:border-indigo-500 focus:outline-none transition-colors"
                />
              </div>
 
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Security Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-55 bg-slate-50 text-slate-600 text-xs focus:outline-none"
                >
                  <option value="Pricing Analyst">Pricing Analyst</option>
                  <option value="Manager">Manager / Business Owner</option>
                  <option value="Admin">Admin</option>
                  <option value="Viewer">Viewer</option>
                </select>
              </div>
 
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-[#4f3bbf] hover:bg-[#4331a8] text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-lg shadow-indigo-600/10 disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Creating...' : 'Sign Up'}
              </button>
            </form>
 
            {/* Mobile-only toggle */}
            <button
              type="button"
              onClick={() => { setIsSignUp(false); setError(''); }}
              className="block md:hidden text-xs text-[#4f3bbf] font-bold mt-4 cursor-pointer hover:underline mx-auto"
            >
              Already have an account? Sign In
            </button>
          </div>
        </div>
 
      </div>
    </div>
  );
}
