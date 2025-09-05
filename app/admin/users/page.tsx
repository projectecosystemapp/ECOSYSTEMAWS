'use client';

import { useState, useEffect } from 'react';

import AdminLayout from '@/components/admin/AdminLayout';
import DataTable from '@/components/admin/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { userProfileApi } from '@/lib/api';
import { logger } from '@/lib/logger';

interface UserWithStats {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'CUSTOMER' | 'PROVIDER' | 'ADMIN';
  city?: string;
  state?: string;
  bookingsCount: number;
  servicesCount: number;
  reviewsCount: number;
  totalSpent: number;
  totalEarned: number;
  lastActivity?: string;
  createdAt?: string;
}

export default function UserManagement(): JSX.Element {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserWithStats | null>(null);

  useEffect(() => {
    const fetchUsers = async (): Promise<void> => {
      try {
        setLoading(true);
        // adminApi not yet implemented - using empty array for now
        // const usersData = await adminApi.getUsersWithStats();
        const usersData: UserWithStats[] = [];
        setUsers(usersData);
      } catch (error) {
        logger.error('Error fetching users', error as Error);
      } finally {
        setLoading(false);
      }
    };

    void fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: 'CUSTOMER' | 'PROVIDER' | 'ADMIN'): Promise<void> => {
    try {
      // TODO: Add role field to UserProfile schema or use userType field
      // await userProfileApi.update({ id: userId, role: newRole });
      
      // Refresh user list
      // adminApi not yet implemented - would refresh here
      // const usersData = await adminApi.getUsersWithStats();
      // setUsers(usersData as any);
      
      // Update selected user if it's the one being changed
      if (selectedUser?.id === userId) {
        // const updatedUser = usersData.find((u: UserWithStats) => u.id === userId);
        const updatedUser = { ...selectedUser, role: newRole };
        setSelectedUser(updatedUser || null);
      }
    } catch (error) {
      logger.error('Error updating user role', error as Error);
    }
  };

  const getUserDisplayName = (user: UserWithStats): string => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.email;
  };

  const columns = [
    {
      key: 'email',
      label: 'User',
      sortable: true,
      render: (value: string, row: UserWithStats) => (
        <div>
          <div className="font-medium text-gray-900">
            {getUserDisplayName(row)}
          </div>
          <div className="text-sm text-gray-500">{value}</div>
        </div>
      )
    },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      render: (value: string) => (
        <Badge 
          variant="outline" 
          className={
            value === 'ADMIN' ? 'text-red-600 bg-red-100' :
            value === 'PROVIDER' ? 'text-blue-600 bg-blue-100' :
            'text-green-600 bg-green-100'
          }
        >
          {value}
        </Badge>
      )
    },
    {
      key: 'bookingsCount',
      label: 'Bookings',
      sortable: true
    },
    {
      key: 'servicesCount',
      label: 'Services',
      sortable: true
    },
    {
      key: 'totalSpent',
      label: 'Total Spent',
      sortable: true,
      render: (value: number) => value > 0 ? `$${value.toFixed(2)}` : '-'
    },
    {
      key: 'totalEarned',
      label: 'Total Earned',
      sortable: true,
      render: (value: number) => value > 0 ? `$${value.toFixed(2)}` : '-'
    },
    {
      key: 'createdAt',
      label: 'Joined',
      sortable: true,
      render: (value: string) => value ? new Date(value).toLocaleDateString() : '-'
    }
  ];

  const userActions = (user: UserWithStats): JSX.Element => (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          setSelectedUser(user);
        }}
      >
        View Details
      </Button>
      {user.role !== 'ADMIN' && (
        <select
          className="text-xs border border-gray-300 rounded px-2 py-1 ml-2"
          value={user.role}
          onChange={(e) => {
            e.stopPropagation();
            void handleRoleChange(user.id, e.target.value as 'CUSTOMER' | 'PROVIDER' | 'ADMIN');
          }}
        >
          <option value="CUSTOMER">Customer</option>
          <option value="PROVIDER">Provider</option>
          <option value="ADMIN">Admin</option>
        </select>
      )}
    </>
  );

  return (
    <AdminLayout title="User Management">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User List */}
        <div className="lg:col-span-2">
          <DataTable
            title="All Users"
            columns={columns}
            data={users}
            searchKey="email"
            actions={userActions}
            loading={loading}
            emptyMessage="No users found"
          />
        </div>

        {/* User Details Sidebar */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>User Details</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedUser ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">
                      {getUserDisplayName(selectedUser)}
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">{selectedUser.email}</p>
                    <Badge 
                      variant="outline"
                      className={
                        selectedUser.role === 'ADMIN' ? 'text-red-600 bg-red-100' :
                        selectedUser.role === 'PROVIDER' ? 'text-blue-600 bg-blue-100' :
                        'text-green-600 bg-green-100'
                      }
                    >
                      {selectedUser.role}
                    </Badge>
                  </div>

                  {selectedUser.city && selectedUser.state && (
                    <div>
                      <span className="text-sm font-medium">Location:</span>
                      <p className="text-sm text-gray-600">
                        {selectedUser.city}, {selectedUser.state}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <span className="text-sm font-medium">Bookings</span>
                      <p className="text-lg font-semibold">{selectedUser.bookingsCount}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Services</span>
                      <p className="text-lg font-semibold">{selectedUser.servicesCount}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Total Spent</span>
                      <p className="text-lg font-semibold text-red-600">
                        ${selectedUser.totalSpent.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Total Earned</span>
                      <p className="text-lg font-semibold text-green-600">
                        ${selectedUser.totalEarned.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <span className="text-sm font-medium">Joined:</span>
                    <p className="text-sm text-gray-600">
                      {selectedUser.createdAt 
                        ? new Date(selectedUser.createdAt).toLocaleDateString() 
                        : 'Unknown'
                      }
                    </p>
                  </div>

                  <div className="pt-4 space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        // TODO: Implement user activity history modal
                        alert('User activity history coming soon');
                      }}
                    >
                      View Activity History
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-red-600 border-red-300 hover:bg-red-50"
                      onClick={() => {
                        // TODO: Implement user suspension
                        alert('User suspension coming soon');
                      }}
                    >
                      Suspend Account
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Select a user to view details
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}