import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export default function DashboardLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto h-full animate-pulse">

      <div className="mb-8">
        <div className="h-8 w-48 bg-gray-200 rounded-lg mb-2" />
        <div className="h-4 w-24 bg-gray-200 rounded" />
      </div>


      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-gray-200 border-2 rounded-xl p-0 flex-1">
            <CardContent className="flex items-center justify-between p-5 sm:p-6">
              <div className="space-y-3 flex-1 mr-4">
                <div className="h-3 w-2/3 bg-gray-200 rounded" />
                <div className="h-8 w-1/2 bg-gray-200 rounded-lg" />
              </div>
              <div className="w-12 h-12 bg-gray-200 rounded-full shrink-0" />
            </CardContent>
          </Card>
        ))}
      </div>


      <Card className="p-4 sm:p-6 mb-8">
        <div className="h-6 w-32 bg-gray-200 rounded mb-4" />
        <div className="flex flex-wrap gap-2.5 sm:gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-9 w-28 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </Card>


      <Card>
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="h-6 w-44 bg-gray-200 rounded" />
        </div>
        <div className="divide-y divide-gray-200">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 sm:p-6 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-5 w-36 bg-gray-200 rounded-md" />
                <div className="h-5 w-16 bg-gray-200 rounded-full" />
              </div>
              <div className="h-4 w-3/4 bg-gray-200 rounded" />
              <div className="h-3 w-24 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}