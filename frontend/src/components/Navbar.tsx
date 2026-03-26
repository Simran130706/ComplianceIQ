import React from 'react';
import { NavLink } from 'react-router-dom';
import { Shield, Home, FileText, CheckSquare, AlertCircle, Search, PlayCircle, Eye } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

const navItems = [
  { name: 'Home', path: '/home', icon: Home },
  { name: 'Policies', path: '/policies', icon: FileText },
  { name: 'Compliance Engine', path: '/compliance', icon: CheckSquare },
  { name: 'Violations', path: '/violations', icon: AlertCircle },
  { name: 'Violation Investigation', path: '/investigation', icon: Search },
  { name: 'Simulator', path: '/simulator', icon: PlayCircle },
  { name: 'RBI SEBI Monitor', path: '/rbi-monitor', icon: Eye },
];

export const Navbar: React.FC = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 h-20 bg-white border-b border-slate-100 px-8 flex items-center justify-between z-[100] shadow-sm">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-[#A8E6CF]/10 rounded-xl">
          <Shield className="w-6 h-6 text-[#3BB77E]" />
        </div>
        <span className="text-xl font-black text-slate-800 tracking-tighter">ComplianceIQ</span>
      </div>

      <div className="hidden lg:flex items-center gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) => twMerge(
              clsx(
                "px-4 py-2 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 group",
                isActive 
                  ? "bg-[#A8E6CF]/10 text-[#3BB77E]" 
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              )
            )}
          >
            <item.icon className="w-4 h-4" />
            {item.name}
          </NavLink>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
        </div>
      </div>
    </nav>
  );
};
