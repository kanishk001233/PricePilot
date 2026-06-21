'use client';

import React from 'react';
import Link from 'next/link';
import { Home as HomeIcon, ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Home</h1>
          <p className="text-slate-400 text-sm mt-0.5">Welcome back to PricePilot. Select an option to begin.</p>
        </div>
      </div>

      {/* Main content placeholder */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-8 shadow-lg max-w-4xl text-left space-y-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-indigo-950/60 text-indigo-400 border border-indigo-900/30">
            <HomeIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Home Portal</h2>
            <p className="text-slate-400 text-sm mt-1 leading-relaxed">
              This page acts as the main entry portal. Let your assistant know what tools, quick stats, or shortcuts you would like to place here.
            </p>
          </div>
        </div>

        <div className="border-t border-slate-800/60 pt-6">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-white bg-indigo-650 hover:bg-indigo-600 shadow-md shadow-indigo-950/50 hover:shadow-indigo-900/40 active:scale-95 transition-all"
          >
            <span>Proceed to Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

    </div>
  );
}
