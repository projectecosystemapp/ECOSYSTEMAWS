'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { signOut, getCurrentUser } from 'aws-amplify/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import NotificationBadge from '@/components/notifications/NotificationBadge';
import { 
  Home,
  User,
  Briefcase,
  Calendar,
  MessageCircle,
  Settings,
  DollarSign,
  LayoutDashboard,
  LogOut,
  ChevronLeft,
  Menu,
  X,
  ShieldCheck,
  Star,
  Search
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: any;
  badge?: number | string;
}

export default function UnifiedNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<'customer' | 'provider' | 'admin' | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      
      // Get user role from profile or localStorage
      const storedRole = localStorage.getItem('userRole');
      if (storedRole) {
        setUserRole(storedRole as 'customer' | 'provider' | 'admin');
      } else {
        // Default to customer if no role found
        setUserRole('customer');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleBackNavigation = () => {
    // Smart back navigation based on current path
    const pathSegments = pathname.split('/').filter(Boolean);
    
    if (pathSegments.length > 1) {
      // Go up one level in the path hierarchy
      const parentPath = '/' + pathSegments.slice(0, -1).join('/');
      router.push(parentPath);
    } else {
      // Go to appropriate dashboard based on role
      if (userRole === 'provider') {
        router.push('/provider/dashboard');
      } else if (userRole === 'admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    }
  };

  // Define navigation items based on user role
  const getNavItems = (): NavItem[] => {
    const commonItems: NavItem[] = [
      { label: 'Messages', href: '/messages', icon: MessageCircle, badge: unreadMessages > 0 ? unreadMessages : undefined },
    ];

    if (userRole === 'provider') {
      return [
        { label: 'Dashboard', href: '/provider/dashboard', icon: LayoutDashboard },
        { label: 'Services', href: '/provider/services', icon: Briefcase },
        { label: 'Bookings', href: '/provider/bookings', icon: Calendar },
        { label: 'Earnings', href: '/provider/earnings', icon: DollarSign },
        { label: 'Reviews', href: '/provider/reviews', icon: Star },
        ...commonItems,
        { label: 'Settings', href: '/provider/settings', icon: Settings },
      ];
    } else if (userRole === 'admin') {
      return [
        { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        { label: 'Users', href: '/admin/users', icon: User },
        { label: 'Services', href: '/admin/services', icon: Briefcase },
        { label: 'Bookings', href: '/admin/bookings', icon: Calendar },
        { label: 'Transactions', href: '/admin/transactions', icon: DollarSign },
        { label: 'Reviews', href: '/admin/reviews', icon: Star },
        { label: 'Verification', href: '/admin/verification', icon: ShieldCheck },
        ...commonItems,
        { label: 'Settings', href: '/admin/settings', icon: Settings },
      ];
    } else {
      // Customer navigation
      return [
        { label: 'Home', href: '/', icon: Home },
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { label: 'Browse Services', href: '/services', icon: Search },
        { label: 'My Bookings', href: '/bookings', icon: Calendar },
        ...commonItems,
        { label: 'Profile', href: '/profile', icon: User },
      ];
    }
  };

  const navItems = getNavItems();

  // Check if we should show back button
  const showBackButton = pathname !== '/' && 
    pathname !== '/dashboard' && 
    pathname !== '/provider/dashboard' && 
    pathname !== '/admin';

  if (loading) {
    return (
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="animate-pulse h-8 w-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <>
      <nav className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Left side */}
            <div className="flex items-center">
              {/* Back button */}
              {showBackButton && (
                <button
                  onClick={handleBackNavigation}
                  className="mr-4 p-2 hover:bg-gray-100 rounded-md transition-colors"
                  aria-label="Go back"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}

              {/* Logo */}
              <Link href="/" className="flex items-center">
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Ecosystem
                </span>
                {userRole && (
                  <Badge variant="secondary" className="ml-2 capitalize">
                    {userRole}
                  </Badge>
                )}
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:flex ml-10 space-x-4">
                {navItems.slice(0, 5).map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        isActive
                          ? 'text-blue-600 bg-blue-50'
                          : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="h-4 w-4 mr-1" />
                      {item.label}
                      {item.badge && (
                        <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-4">
              {/* User info */}
              {user && (
                <span className="hidden sm:block text-sm text-gray-600">
                  {user.signInDetails?.loginId || user.username}
                </span>
              )}

              {/* Role switcher (if user has multiple roles) */}
              <div className="hidden lg:flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/dashboard')}
                  className={userRole === 'customer' ? 'bg-gray-100' : ''}
                >
                  Customer
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/provider/dashboard')}
                  className={userRole === 'provider' ? 'bg-gray-100' : ''}
                >
                  Provider
                </Button>
                {/* Admin button only if user is admin */}
                {userRole === 'admin' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/admin')}
                    className="bg-gray-100"
                  >
                    Admin
                  </Button>
                )}
              </div>

              {/* Notifications */}
              {user && (
                <NotificationBadge 
                  userEmail={user.signInDetails?.loginId || user.username}
                  className="hidden sm:flex mr-2"
                />
              )}

              {/* Sign out button */}
              <Button
                onClick={handleSignOut}
                variant="outline"
                size="sm"
                className="hidden sm:flex"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Sign Out
              </Button>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 hover:bg-gray-100 rounded-md"
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-white">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
                      isActive
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {item.label}
                    {item.badge && (
                      <Badge variant="destructive" className="ml-auto">
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                );
              })}
              
              <div className="border-t pt-2 mt-2">
                <button
                  onClick={handleSignOut}
                  className="flex items-center w-full px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Breadcrumb navigation for complex paths */}
      {pathname.split('/').filter(Boolean).length > 2 && (
        <div className="bg-gray-50 border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2 text-sm">
                <li>
                  <Link href="/" className="text-gray-500 hover:text-gray-700">
                    Home
                  </Link>
                </li>
                {pathname.split('/').filter(Boolean).map((segment, index, array) => {
                  const href = '/' + array.slice(0, index + 1).join('/');
                  const isLast = index === array.length - 1;
                  const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
                  
                  return (
                    <li key={href} className="flex items-center">
                      <ChevronLeft className="h-4 w-4 text-gray-400 rotate-180" />
                      {isLast ? (
                        <span className="ml-2 text-gray-900 font-medium">{label}</span>
                      ) : (
                        <Link href={href} className="ml-2 text-gray-500 hover:text-gray-700">
                          {label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}