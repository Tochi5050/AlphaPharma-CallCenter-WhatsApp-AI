'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { FileText, MessageSquare, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { fetchHandoffs, type HandoffSummary } from '@/lib/api';


interface ActivityItem {
  id: string;
  conversationId: string;
  agentName: string;
  action: string;
  timestamp: Date;
  details?: string;
}

function getActionIcon(action: string) {
  if (action.includes('Resolved')) return CheckCircle;
  if (action.includes('Pending') || action.includes('awaiting')) return Clock;
  if (action.includes('comment')) return MessageSquare;
  return FileText;
}

function getActionColor(action: string) {
  if (action.includes('Resolved')) return 'text-green-600 bg-green-50';
  if (action.includes('Pending') || action.includes('awaiting')) return 'text-amber-600 bg-amber-50';
  if (action.includes('comment')) return 'text-blue-600 bg-blue-50';
  return 'text-gray-600 bg-gray-50';
}

const ActivityList = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadActivities() {
      setIsLoading(true);
      try {

        const [pendingRes, awaitingRes, resolvedRes] = await Promise.all([
          fetchHandoffs('pending'),
          fetchHandoffs('awaiting_payment'),
          fetchHandoffs('resolved'),
        ]);

        const allTickets = [
          ...pendingRes.handoffs,
          ...awaitingRes.handoffs,
          ...resolvedRes.handoffs,
        ];


        let localComments: Record<string, any[]> = {};
        if (typeof window !== 'undefined') {
          const saved = localStorage.getItem('kamsi_dashboard_comments');
          if (saved) {
            try {
              localComments = JSON.parse(saved);
            } catch (e) {
              console.error('Failed to load local comments in ActivityList', e);
            }
          }
        }

        const items: ActivityItem[] = [];


        allTickets.forEach((t) => {

          items.push({
            id: `${t.id}-created`,
            conversationId: t.id,
            agentName: t.category === 'media_upload' ? 'System' : 'AI Assistant',
            action: `New ticket created (${t.status})`,
            timestamp: new Date(t.timestamp),
            details: `Category: ${t.category.replace(/_/g, ' ')}. Reason: ${t.reason}`,
          });


          if (t.status === 'resolved') {

            items.push({
              id: `${t.id}-resolved`,
              conversationId: t.id,
              agentName: 'Miss Chisom',
              action: 'Status changed to Resolved',
              timestamp: new Date(t.timestamp + 5000),
              details: 'Ticket marked resolved successfully',
            });
          }


          const comments = localComments[t.id] || [];
          comments.forEach((c) => {
            items.push({
              id: c.id,
              conversationId: t.id,
              agentName: c.agentName,
              action: 'Added comment',
              timestamp: new Date(c.timestamp),
              details: c.content,
            });
          });
        });

        // Sort chronologically 
        items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        setActivities(items);
      } catch (err) {
        console.error('Failed to compile activity logs', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadActivities();
  }, []);

  return (
    <Card>
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Recent Activity</h2>
      </div>

      {isLoading ? (

        <div className="divide-y divide-gray-200 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 sm:p-6 flex items-start gap-3 sm:gap-4">
              <div className="w-10 h-10 bg-gray-200 rounded-lg shrink-0" />
              <div className="flex-1 space-y-3 min-w-0">
                <div className="flex justify-between items-start">
                  <div className="space-y-1.5 flex-1 mr-4">
                    <div className="h-4 w-1/3 bg-gray-200 rounded" />
                    <div className="h-3 w-1/4 bg-gray-200 rounded" />
                  </div>
                  <div className="h-3.5 w-24 bg-gray-200 rounded" />
                </div>
                <div className="h-3 w-3/4 bg-gray-200 rounded" />
                <div className="h-3 w-28 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {activities.map((log) => {
            const Icon = getActionIcon(log.action);
            const colorClass = getActionColor(log.action);

            return (
              <div key={log.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                <CardContent className="p-0">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className={`p-2.5 sm:p-3 rounded-lg shrink-0 ${colorClass}`}>
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-4 mb-2">
                        <div>
                          <p className="font-medium text-gray-900 text-sm sm:text-base">{log.action}</p>
                          <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
                            by <span className="font-medium">{log.agentName}</span>
                          </p>
                        </div>
                        <time className="text-xs sm:text-sm text-gray-500 whitespace-nowrap" suppressHydrationWarning>
                          {format(log.timestamp, 'PPp')}
                        </time>
                      </div>
                      {log.details && (
                        <p className="text-xs sm:text-sm text-gray-600 mb-2 leading-relaxed">{log.details}</p>
                      )}
                      <Link
                        href={`/conversations?id=${log.conversationId}`}
                        className="inline-flex items-center gap-1 text-xs sm:text-sm text-[#0c237c] hover:text-[#0a1d66] font-medium"
                      >
                        View Conversation
                        <span>→</span>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </div>
            );
          })}

          {activities.length === 0 && (
            <div className="p-8 text-center text-gray-500 text-sm">
              No recent activity recorded yet.
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default ActivityList;
