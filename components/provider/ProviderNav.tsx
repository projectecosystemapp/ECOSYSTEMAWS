'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { messageApi } from '@/lib/api';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/provider/dashboard',
    icon: '📊'
  },
  {
    label: 'Services',
    href: '/provider/services',
    icon: '🛠️'
  },
  {
    label: 'Bookings',
    href: '/provider/bookings',
    icon: '📅'
  },
  {
    label: 'Messages',
    href: '/messages',
    icon: '💬'
  },
  {
    label: 'Earnings',
    href: '/provider/earnings',
    icon: '💰'
  }
];

export default function ProviderNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Track unread message count
  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      try {
        const userEmail = user.email;
        const count = await messageApi.getUnreadCount(userEmail);
        setUnreadCount(count);
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };

    fetchUnreadCount();

    // Subscribe to unread count changes
    const userEmail = user.email;
    const subscription = messageApi.subscribeToUnreadCount(userEmail, setUnreadCount);

    return () => {
      subscription?.unsubscribe();
    };
  }, [user]);

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/provider/dashboard" className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-blue-600">Ecosystem</span>
              <span className="text-sm text-gray-500">Provider</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors relative',
                  pathname === item.href || pathname.startsWith(item.href + '/')
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                )}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
                {item.href === '/messages' && unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </Link>
            ))}
          </div>

          {/* Commission Rate Badge */}
          <div className="hidden md:flex items-center">
            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
              Only 8% Commission
            </div>
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
                  'flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium relative',
                  pathname === item.href || pathname.startsWith(item.href + '/')
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
                {item.href === '/messages' && unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="ml-2 h-5 w-5 text-xs p-0 flex items-center justify-center"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </Link>
            ))}
            <div className="px-3 py-2">
              <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium text-center">
                Only 8% Commission
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}