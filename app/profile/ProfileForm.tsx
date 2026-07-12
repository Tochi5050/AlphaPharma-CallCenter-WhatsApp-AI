'use client';

import { useState } from 'react';
import { User as UserIcon, Mail, Bell, LogOut } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { mockUserdetails } from '../data/mockData';

export default function ProfileForm() {
  const targetId = "2";
  const currentUser = mockUserdetails.find(user => user.id === targetId)!;
  const [notificationsEnabled, setNotificationsEnabled] = useState(currentUser?.notificationsEnabled);

  const handleLogout = () => {
    alert('Logout functionality would be implemented here');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto h-full bg-gray-50">
      {/* 
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">Profile</h1>
        <p className="text-gray-600 mt-2 text-sm sm:text-base">Manage your account settings</p>
      </div>

      <div className="max-w-2xl">

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#0c237c] rounded-full flex items-center justify-center shrink-0">
                <UserIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">{currentUser.name}</h3>
                <p className="text-sm sm:text-base text-gray-600">{currentUser.role}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                  <UserIcon size={20} className="text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Name</p>
                  <p className="font-medium text-gray-900 text-sm sm:text-base">{currentUser.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                  <Mail size={20} className="text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Email</p>
                  <p className="font-medium text-gray-900 text-sm sm:text-base">{currentUser.email}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>


        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Notification Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                  <Bell size={20} className="text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm sm:text-base">WhatsApp Notifications</p>
                  <p className="text-xs sm:text-sm text-gray-600">Get notified about new handoffs</p>
                </div>
              </div>
              <Switch
                className="profile-toggle"
                checked={notificationsEnabled}
                onCheckedChange={setNotificationsEnabled}
              />
            </div>
          </CardContent>
        </Card>


        <Card>
          <CardContent className="p-4 sm:p-6">
            <Button
              variant="destructive"
              onClick={handleLogout}
              className="w-full justify-center sm:justify-start bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
            >
              <LogOut size={20} />
              <span className="font-medium">Logout</span>
            </Button>
          </CardContent>
        </Card>
      </div>
      */}
    </div>
  );
}
