import React, { useState } from 'react';
import { Button } from '../components/Button';
import { Mic2, CheckCircle, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { signInWithGoogle } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getManagerConfig } from '../config/managerConfig';

export const Login: React.FC = () => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (isDemo: boolean = false) => {
    setIsLoggingIn(true);
    setError(null);
    try {
      const result = await signInWithGoogle(isDemo);
      
      if (result.user) {
        // Check domain restrictions if needed (e.g., only @simpro)
        const email = result.user.email || '';
        const isSimpro = email.endsWith('@simpro.co') || email.endsWith('@simprogroup.com');
        
        // NOTE: For this demo, we allow the "Demo User" even if domain doesn't match, 
        // but in production you would uncomment the check below:
        /*
        if (!isSimpro && !isDemo) {
          throw new Error("Access Restricted: Please use your Simpro corporate account.");
        }
        */

        // If we are in demo mode (no firebase config), we need to manually update context
        if (!result.providerId) {
            setUser(result.user as any);
        }

        navigate(getManagerConfig(result.user.email) ? '/manager' : '/');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to sign in. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row font-sans">
      
      {/* Left Column: Brand / Value Prop */}
      <div className="lg:w-1/2 bg-brand-navy relative overflow-hidden flex flex-col justify-between p-12 lg:p-20 text-white">
        {/* Background Decor */}
        <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
           <div className="absolute right-0 top-20 w-96 h-96 bg-brand-yellow rounded-full blur-3xl transform translate-x-1/2"></div>
           <div className="absolute left-0 bottom-20 w-96 h-96 bg-blue-500 rounded-full blur-3xl transform -translate-x-1/2"></div>
        </div>

        <div className="relative z-10">
           <div className="flex items-center gap-3 mb-12">
              <div className="w-10 h-10 bg-brand-yellow rounded-lg flex items-center justify-center text-brand-navy shadow-lg shadow-brand-yellow/20">
                <Mic2 size={24} />
              </div>
              <span className="text-2xl font-black tracking-tight">SIMPRO <span className="font-light opacity-80">SE Demo Scoring</span></span>
           </div>

           <h1 className="text-4xl lg:text-6xl font-black tracking-tight leading-tight mb-6">
             Score Better <br/>
             <span className="text-brand-yellow">SE Demos</span>
           </h1>

           <p className="text-lg text-slate-300 max-w-md leading-relaxed mb-8">
             Upload customer-facing demo transcripts, receive evidence-based Sales Engineering coaching, and track customer-centered demo performance.
           </p>

           <div className="space-y-4">
              <div className="flex items-center gap-3">
                 <CheckCircle className="text-green-400" size={20} />
                 <span className="font-semibold">AI-Powered SE Demo Scoring</span>
              </div>
              <div className="flex items-center gap-3">
                 <CheckCircle className="text-green-400" size={20} />
                 <span className="font-semibold">Manager-Ready Coaching Summaries</span>
              </div>
              <div className="flex items-center gap-3">
                 <CheckCircle className="text-green-400" size={20} />
                 <span className="font-semibold">Enterprise SSO Security</span>
              </div>
           </div>
        </div>

        <div className="relative z-10 mt-12">
           <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Powered by Gemini</p>
        </div>
      </div>

      {/* Right Column: Login Form */}
      <div className="lg:w-1/2 bg-slate-50 flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-white p-10 rounded-2xl shadow-xl border border-slate-200">
           
           <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-brand-navy mb-2">Welcome Back</h2>
              <p className="text-slate-500">Please sign in to access SE Demo Scoring.</p>
           </div>

           {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-sm text-red-700 animate-fadeIn">
                 <AlertCircle size={16} className="mt-0.5 flex-shrink-0"/>
                 {error}
              </div>
           )}

           <div className="space-y-4">
              <button 
                onClick={() => handleLogin(false)}
                disabled={isLoggingIn}
                className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-3 px-4 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                 <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                 {isLoggingIn ? 'Connecting...' : 'Sign in with Google'}
              </button>

              <div className="relative py-4">
                 <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                 </div>
                 <div className="relative flex justify-center">
                    <span className="bg-white px-2 text-xs text-slate-400 uppercase font-bold">Or</span>
                 </div>
              </div>

              {/* Demo Button for easy testing without API keys */}
              <button 
                 onClick={() => handleLogin(true)}
                 className="w-full py-3 px-4 bg-brand-blue/5 text-brand-navy font-bold text-sm rounded-lg hover:bg-brand-blue/10 transition-colors flex items-center justify-center gap-2"
              >
                 Try Demo Mode (Guest Access) <ArrowRight size={14} />
              </button>
           </div>

           <div className="mt-8 text-center">
              <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
                 <Lock size={12} />
                 Secure connection via Google Firebase
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};
