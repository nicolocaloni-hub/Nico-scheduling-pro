
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: 'Progetti', path: '/', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
    )},
    { label: 'Copione', path: '/script', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
    )},
    { label: 'Piano Lav.', path: '/stripboard', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
    )},
    { label: 'Calendario', path: '/calendar', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
    )},
  ];

  const isCurrent = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col pb-20 md:pb-0 md:pl-20">
      {/* Desktop Side Nav */}
      <nav className="hidden md:flex flex-col fixed left-0 top-0 h-full w-20 bg-gray-950 border-r border-gray-800 z-50">
        <div className="flex-1 flex flex-col items-center py-6 gap-8">
           <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center font-bold text-xl">N</div>
           {navItems.map((item) => (
             <button
               key={item.path}
               onClick={() => navigate(item.path)}
               className={`p-3 rounded-xl transition-colors ${isCurrent(item.path) ? 'bg-gray-800 text-primary-500' : 'text-gray-400 hover:text-white'}`}
               title={item.label}
             >
               {item.icon}
             </button>
           ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-gray-950 border-t border-gray-800 z-50 px-4 pb-safe">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => (
             <button
               key={item.path}
               onClick={() => navigate(item.path)}
               className={`flex flex-col items-center justify-center w-16 h-full space-y-1 ${isCurrent(item.path) ? 'text-primary-500' : 'text-gray-500'}`}
             >
               {item.icon}
               <span className="text-[10px] font-medium">{item.label}</span>
             </button>
           ))}
        </div>
      </nav>
    </div>
  );
};
