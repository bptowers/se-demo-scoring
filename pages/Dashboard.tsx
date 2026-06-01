import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { BarChart3, Mic2, Target, Home, ArrowRight } from 'lucide-react';

const AppCard: React.FC<{ 
  title: string; 
  description: string; 
  icon: React.ReactNode; 
  status: 'Active' | 'Coming Soon'; 
  link?: string;
  primary?: boolean;
}> = ({ title, description, icon, status, link, primary }) => (
  <div className={`relative group rounded-xl p-6 border transition-all duration-300 flex flex-col h-full ${
    primary 
      ? 'bg-brand-navy border-brand-navy shadow-xl shadow-brand-navy/20' 
      : 'bg-white border-slate-200 hover:border-brand-yellow hover:shadow-lg'
  }`}>
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-lg ${primary ? 'bg-white/10 text-white' : 'bg-slate-100 text-brand-navy'}`}>
        {icon}
      </div>
      <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${
        status === 'Active' 
          ? 'bg-green-100 text-green-700' 
          : 'bg-slate-100 text-slate-500'
      }`}>
        {status}
      </span>
    </div>
    
    <h3 className={`text-lg font-bold mb-2 ${primary ? 'text-white' : 'text-brand-navy'}`}>{title}</h3>
    <p className={`text-sm mb-8 flex-grow leading-relaxed ${primary ? 'text-slate-300' : 'text-slate-500'}`}>
      {description}
    </p>

    {link && status === 'Active' ? (
      <Link to={link} className="mt-auto">
        <Button fullWidth variant={primary ? 'primary' : 'primary'}>Open App</Button>
      </Link>
    ) : (
      <div className="mt-auto">
         <Button fullWidth disabled className="bg-slate-100 text-slate-400 cursor-not-allowed">Coming Soon</Button>
      </div>
    )}
  </div>
);

export const Dashboard: React.FC = () => {
  return (
    <div>
      {/* Hero Section */}
      <div className="bg-brand-yellow w-full py-16 px-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-brand-navy opacity-10 skew-x-12 translate-x-20"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col md:flex-row items-center justify-between">
          <div className="md:w-1/2 mb-8 md:mb-0">
            <h1 className="text-4xl md:text-5xl font-black text-brand-navy mb-4 tracking-tight">
              YOUR SIMPRO AE HOMEBASE
            </h1>
            <p className="text-brand-navy/80 text-lg font-medium max-w-xl mb-8 leading-relaxed">
              Welcome to AE Central, your single starting point for all the tools you need to excel. Access coaching, score discovery calls, and track performance.
            </p>
            <div className="flex gap-4">
              <Button className="bg-brand-navy text-white hover:bg-brand-navy/90">
                View AE Apps
              </Button>
              <Button variant="outline" className="border-brand-navy text-brand-navy hover:bg-white/20">
                Quick Tour
              </Button>
            </div>
          </div>
          {/* Hero Image Decoration */}
          <div className="md:w-1/3 relative hidden md:block">
             <div className="bg-brand-navy rounded-lg p-4 shadow-2xl rotate-3 transform transition-transform hover:rotate-0">
                <div className="bg-white rounded h-48 flex items-center justify-center overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 opacity-50"></div>
                  <BarChart3 className="text-brand-navy w-24 h-24 opacity-20" />
                  <div className="absolute bottom-4 right-4 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
                    +25% Performance
                  </div>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Apps Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-brand-navy mb-2">AE Apps</h2>
          <p className="text-slate-500">Select an application to launch.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <AppCard 
            title="GROW Coaching"
            description="Your hub for development planning, 1:1 notes, and tracking personal goals."
            icon={<Target size={24} />}
            status="Active"
            link="#"
          />
          
          {/* Primary Feature Card */}
          <AppCard 
            title="Call Scoring"
            description="Upload discovery call transcripts and compare LLM, self, and manager scores to drive coaching excellence."
            icon={<Mic2 size={24} />}
            status="Active"
            link="/scoring"
            primary={true}
          />

          <AppCard 
            title="Quota Attainment Tracker"
            description="Track your real-time progress against quota targets and performance metrics."
            icon={<BarChart3 size={24} />}
            status="Active"
            link="#"
          />

          <AppCard 
            title="Home Run Presales"
            description="Analyze your impact on pipeline generation and revenue contribution."
            icon={<ArrowRight size={24} />}
            status="Active"
            link="#"
            primary={true}
          />

          <AppCard 
            title="Knowledge Base"
            description="Central repository for all technical documentation and sales assets."
            icon={<Home size={24} />}
            status="Coming Soon"
          />
        </div>
      </div>
    </div>
  );
};