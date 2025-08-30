'use client';

import { useEffect, useState } from 'react';
import { signOut, getCurrentUser } from 'aws-amplify/auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, User } from 'lucide-react';

export default function SignOutPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkCurrentUser();
  }, []);

  const checkCurrentUser = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      setCurrentUser(null);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
      router.push('/auth/register');
    } catch (error) {
      console.error('Error signing out:', error);
      // Force sign out even if there's an error
      try {
        await signOut({ global: true });
        router.push('/auth/register');
      } catch (err) {
        // If all else fails, clear local storage and redirect
        localStorage.clear();
        sessionStorage.clear();
        router.push('/auth/register');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Account Management</CardTitle>
          <CardDescription className="text-center">
            Manage your Ecosystem account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentUser ? (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Currently signed in as:</p>
                    <p className="text-sm text-blue-700">
                      {currentUser.signInDetails?.loginId || currentUser.username}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleSignOut}
                  className="w-full"
                  variant="destructive"
                  disabled={loading}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {loading ? 'Signing out...' : 'Sign Out'}
                </Button>

                <Button
                  onClick={handleContinue}
                  className="w-full"
                  variant="outline"
                >
                  Continue as {currentUser.signInDetails?.loginId || currentUser.username}
                </Button>
              </div>

              <div className="text-sm text-gray-500 text-center pt-4">
                <p>Want to use a different account?</p>
                <p className="font-medium">Sign out first, then register or sign in.</p>
              </div>
            </>
          ) : (
            <>
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">No user is currently signed in</p>
                <div className="space-y-3">
                  <Button
                    onClick={() => router.push('/auth/register')}
                    className="w-full"
                  >
                    Create New Account
                  </Button>
                  <Button
                    onClick={() => router.push('/auth/login')}
                    className="w-full"
                    variant="outline"
                  >
                    Sign In
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}