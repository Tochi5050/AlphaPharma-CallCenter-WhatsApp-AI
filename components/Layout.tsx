'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, MessageSquare, FileText, User, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/conversations', label: 'Conversations', icon: MessageSquare },
    { path: '/activity', label: 'Activity Log', icon: FileText },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-50 overflow-hidden">
      {/* Mobile Top Header */}
      <header className="lg:hidden h-16 bg-[#0c237c] text-white flex items-center justify-between px-6 border-b border-[#0d2989] shrink-0 select-none">
        <div className="flex flex-col">
          <span className="font-semibold tracking-wider text-base">ALPHA PHARMACY</span>
          <span className="text-xs text-blue-200">Multi-Agent AI Handoff</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSidebarOpen(true)}
          className="text-white hover:bg-[#0d2989]"
          aria-label="Open Sidebar"
        >
          <Menu size={24} />
        </Button>
      </header>

      {/* Backdrop overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar / Navigation Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0c237c] text-white flex flex-col transform transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-[#0d2989] flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">ALPHA PHARMACY</h1>
            <p className="text-sm text-blue-200 mt-1">Multi-Agent AI Handoff log</p>
          </div>
          {/* Close button for mobile sidebar */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden text-blue-200 hover:text-white hover:bg-[#0d2989]"
            aria-label="Close Sidebar"
          >
            <X size={20} />
          </Button>
        </div>
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-[#f34801] text-white'
                        : 'text-blue-100 hover:bg-[#0d2989]'
                    }`}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="p-4 border-t border-[#0d2989]">
          {/* Optional bottom bar info */}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col min-h-0 bg-gray-50">
        {children}
      </main>
    </div>
  );
}
