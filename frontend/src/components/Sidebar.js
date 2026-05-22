import React from 'react';

const Sidebar = () => {
  return (
    <div className="w-64 min-h-screen bg-[#0d0d0d] border-r border-gray-800 flex flex-col text-white">
      {/* Bagian Logo / Nama */}
      <div className="h-20 flex items-center px-8 border-b border-gray-800">
        <h2 className="text-xl font-bold tracking-wider text-green-400">
          TOTAL<span className="text-white">FUND</span>
        </h2>
      </div>

      {/* Bagian Menu Navigasi */}
      <div className="flex flex-col py-6 px-4 space-y-2 flex-grow">
        
        {/* Menu 1: Dashboard (Aktif) */}
        <div className="flex items-center px-4 py-3 bg-gray-800/50 text-green-400 rounded-lg cursor-pointer">
          {/* Icon Home */}
          <svg className="w-5 h-5 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="font-medium">Portfolio Live</span>
        </div>

        {/* Menu 2: Financial News */}
        <div className="flex items-center px-4 py-3 text-gray-400 hover:text-white hover:bg-gray-800/30 rounded-lg cursor-pointer transition-colors">
          {/* Icon News */}
          <svg className="w-5 h-5 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
          <span className="font-medium">Market News</span>
        </div>

        {/* Menu 3: AI Trading Bot */}
        <div className="flex items-center px-4 py-3 text-gray-400 hover:text-white hover:bg-gray-800/30 rounded-lg cursor-pointer transition-colors">
          {/* Icon Robot/Bot */}
          <svg className="w-5 h-5 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="font-medium">AI Bot Trading</span>
        </div>

      </div>

      {/* Bagian Bawah: Status Koneksi / Settings */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center px-4 py-2 text-sm text-gray-400">
          <div className="w-2 h-2 rounded-full bg-green-500 mr-3 animate-pulse"></div>
          System Online
        </div>
      </div>
    </div>
  );
};

export default Sidebar;