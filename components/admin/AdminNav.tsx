'use client';

import { useAuthenticator } from '@aws-amplify/ui-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/admin',
    icon: '📊'
  },
  {
    label: 'Users',
    href: '/admin/users',
    icon: '👥'
  },
  {
    label: 'Services',
    href: '/admin/services',
    icon: '🛠️'
  },
  {
    label: 'Bookings',
    href: '/admin/bookings',
    icon: '📅'
  },
  {
    label: 'Providers',
    href: '/admin/providers',
    icon: '🏢'
  },
  {
    label: 'Analytics',
    href: '/admin/analytics',
    icon: '📈'
  },
  {
    label: 'Settings',
    href: '/admin/settings',
    icon: '⚙️'
  }
];

export default function AdminNav() {
  const pathname = usePathname();
  const { user, signOut } = useAuthenticator((context) => [context.user]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/admin" className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-red-600">Ecosystem</span>
              <span className="text-sm text-gray-500 bg-red-100 px-2 py-1 rounded-full">Admin</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
                    ? 'bg-red-100 text-red-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                )}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          {/* User menu and logout */}
          <div className="hidden md:flex items-center space-x-4">
            <span className="text-sm text-gray-700">
              {user?.signInDetails?.loginId}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              Sign Out
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-600"
            >
              <span className="sr-only">Open menu</span>
              {isMobileMenuOpen ? '✕' : '☰'}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-2 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium',
                  pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
                    ? 'bg-red-100 text-red-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
            <div className="border-t border-gray-200 pt-2 mt-2">
              <div className="px-3 py-2 text-sm text-gray-700">
                {user?.signInDetails?.loginId}
              </div>
              <div className="px-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={signOut}
                  className="w-full text-red-600 border-red-300 hover:bg-red-50"
                >
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}