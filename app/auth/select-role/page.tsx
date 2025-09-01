'use client';

import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Search, Store } from 'lucide-react';

export default function SelectRolePage() {
  const router = useRouter();

  const handleRoleSelection = (role: 'CUSTOMER' | 'PROVIDER') => {
    router.push(`/auth/sign-up?role=${role}`);
  };

  return (
    <div className="container max-w-4xl mx-auto py-16">
      <h1 className="text-3xl font-bold text-center mb-8">
        How will you use Ecosystem?
      </h1>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleRoleSelection('CUSTOMER')}
        >
          <CardHeader className="text-center">
            <Search className="w-12 h-12 mx-auto mb-4 text-primary" />
            <CardTitle>I am a Customer</CardTitle>
            <CardDescription>
              I want to discover, book, and manage services from local providers.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleRoleSelection('PROVIDER')}
        >
          <CardHeader className="text-center">
            <Store className="w-12 h-12 mx-auto mb-4 text-primary" />
            <CardTitle>I am a Service Provider</CardTitle>
            <CardDescription>
              I want to list my services, manage my bookings, and grow my business.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}