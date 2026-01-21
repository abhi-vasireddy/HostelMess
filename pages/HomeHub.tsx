import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Lock, ExternalLink } from 'lucide-react'; 
import { useAuth } from '../App';
import { MockDB } from '../services/mockDb';
import { ServiceModule } from '../types';
import { ICON_MAP } from '../services/iconMap';

export const HomeHub = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [services, setServices] = useState<ServiceModule[]>([]);
  const [loading, setLoading] = useState(true);
  
  const firstName = user?.displayName ? user.displayName.split(' ')[0] : 'Student';
  const initial = firstName[0]?.toUpperCase();

  useEffect(() => {
    const loadServices = async () => {
      const data = await MockDB.getServices();
      setServices(data);
      setLoading(false);
    };
    loadServices();
  }, []);

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      await logout();
      navigate('/login');
    }
  };

  const handleServiceClick = (mod: ServiceModule) => {
    if (!mod.isActive) return;
    
    if (mod.isExternal && mod.path) {
      window.open(mod.path, '_blank');
    } else if (mod.path) {
      navigate(mod.path);
    }
  };

  const renderIcon = (iconName: string, size: number) => {
    const Icon = ICON_MAP[iconName] || ICON_MAP['Utensils'];
    return <Icon size={size} />;
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 animate-in fade-in">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white">
            Campus<span className="text-orange-500">Hub</span>
          </h1>
          <p className="text-slate-500 font-medium">Welcome back, {firstName}</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 pr-2 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
              {initial}
            </div>
            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
            <button 
              onClick={handleLogout} 
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all"
              title="Logout"
            >
                <LogOut size={18} />
            </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-slate-900 rounded-[2rem] p-6 mb-8 text-white relative overflow-hidden shadow-xl">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-2">What's happening?</h2>
          <p className="opacity-80 mb-4 max-w-xs">Check out the latest hostel notices and tonight's special dinner.</p>
          <button className="bg-white text-slate-900 px-4 py-2 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors">View Updates</button>
        </div>
        <div className="absolute right-[-20px] bottom-[-20px] opacity-20">
           {renderIcon('Building', 150)}
        </div>
      </div>

      {/* Services Grid */}
      <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Services</h3>
      <div className="grid grid-cols-2 gap-4 pb-20">
        {services.map((mod) => (
          <div 
            key={mod.id}
            onClick={() => handleServiceClick(mod)}
            className={`
              relative p-5 rounded-[2rem] h-44 flex flex-col justify-between overflow-hidden shadow-lg transition-all duration-300 border border-slate-100 dark:border-slate-800
              ${mod.isActive 
                ? 'cursor-pointer hover:scale-[1.02] hover:shadow-xl bg-white dark:bg-slate-900' 
                : 'grayscale opacity-70 cursor-not-allowed bg-slate-100 dark:bg-slate-900/50'}
            `}
          >
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${mod.color} opacity-10 rounded-bl-[4rem]`} />
            
            {!mod.isActive && (
              <div className="absolute top-4 right-4 text-slate-400 z-10">
                 <Lock size={16} />
              </div>
            )}

            {mod.isActive && mod.isExternal && (
               <div className="absolute top-4 right-4 text-slate-300 z-10">
                 <ExternalLink size={14} />
               </div>
            )}

            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${mod.color} flex items-center justify-center text-white shadow-md`}>
              {renderIcon(mod.iconName, 24)}
            </div>

            <div>
              <h4 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">{mod.title}</h4>
              <p className="text-xs text-slate-500 mt-1">{mod.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};