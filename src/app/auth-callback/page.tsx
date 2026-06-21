'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabaseClient';

export default function AuthCallbackPage() {
  const router = useRouter();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processSession = async () => {
      if (!supabaseClient) {
        router.push('/login?error=Database config missing');
        return;
      }

      // 1. Fetch active session resolved by Supabase client in the browser
      const { data, error } = await supabaseClient.auth.getSession();
      
      if (error || !data.session) {
        console.error('Supabase session exchange error:', error);
        router.push(`/login?error=${encodeURIComponent(error?.message || 'Google OAuth exchange failed')}`);
        return;
      }

      const { user } = data.session;

      // 2. Contact our API route to issue the custom JWT cookie and register user in database
      try {
        const res = await fetch('/api/auth/oauth-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Google User'
          })
        });

        if (res.ok) {
          const syncData = await res.json();
          if (syncData.success) {
            router.push('/home');
          } else {
            router.push(`/login?error=${encodeURIComponent(syncData.error || 'Session synchronization error')}`);
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          router.push(`/login?error=${encodeURIComponent(errData.error || 'Failed to sync OAuth session')}`);
        }
      } catch (err) {
        console.error('Server sync error:', err);
        router.push('/login?error=Server synchronization unavailable');
      }
    };

    processSession();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center space-y-4 theme-bg-primary">
      <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}
