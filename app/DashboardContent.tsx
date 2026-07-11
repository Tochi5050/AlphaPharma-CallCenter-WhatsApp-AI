import Link from 'next/link';
import { AlertCircle, Clock, CheckCircle2, CreditCard, ArrowRight } from 'lucide-react';
import { mockConversations } from '@/app/data/mockData';
import { StatusBadge } from '@/components/StatusBadge';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchSummary, fetchHandoffs, type HandoffSummary } from '@/lib/api';

export default async function DashboardPage() {

  const newCount = mockConversations.filter((c) => c.status === 'new').length;
  const awaitingPaymentCount = mockConversations.filter(
    (c) => c.status === 'awaiting-payment'
  ).length;

  let liveSummary = { pending: 0, awaitingPayment: 0, resolvedToday: 0 };
  let liveRecentHandoffs: HandoffSummary[] = [];
  try {
    const [summaryData, handoffsData] = await Promise.all([
      fetchSummary(),
      fetchHandoffs('pending'),
    ]);
    liveSummary = summaryData;
    liveRecentHandoffs = handoffsData.handoffs.slice(0, 5);
  } catch {

  }

  const stats = [
    {
      label: 'New Conversations',
      value: newCount,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    },
    {
      label: 'Pending',
      value: liveSummary.pending,
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
    },
    {
      label: 'Awaiting Payment',
      value: liveSummary.awaitingPayment,
      icon: CreditCard,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
    },
    {
      label: 'Resolved Today',
      value: liveSummary.resolvedToday,
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto h-full">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2 text-sm sm:text-base">Overview</p>
      </div>


      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className={`${stat.bgColor} ${stat.borderColor} border-2 rounded-xl p-0 flex-1`}
            >
              <CardContent className="flex items-center justify-between p-5 sm:p-6">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-3xl sm:text-4xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.color} opacity-20`}>
                  <Icon size={40} className="sm:w-12 sm:h-12" strokeWidth={2} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>


      <Card className="p-4 sm:p-6 mb-8">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Quick Filters</h2>
        <div className="flex flex-wrap gap-2.5 sm:gap-3">
          <Button asChild variant="outline" className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100">
            <Link href="/conversations?filter=new">View New ({newCount})</Link>
          </Button>
          <Button asChild variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100">
            <Link href="/conversations?filter=pending">View Pending ({liveSummary.pending})</Link>
          </Button>
          <Button asChild variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100">
            <Link href="/conversations?filter=awaiting-payment">View Awaiting Payment ({liveSummary.awaitingPayment})</Link>
          </Button>
          <Button asChild variant="outline" className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100">
            <Link href="/conversations?filter=resolved">View Resolved</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/conversations">View All Conversations</Link>
          </Button>
        </div>
      </Card>


      <Card>
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Recently Handed Off</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {liveRecentHandoffs.length > 0 ? (
            liveRecentHandoffs.map((h) => (
              <Link
                key={h.id}
                href={`/conversations?id=${h.id}`}
                className="block p-4 sm:p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <p className="font-medium text-gray-900 text-sm sm:text-base">
                        {h.customerName ?? h.waId}
                      </p>
                      <StatusBadge status={h.status} size="sm" />
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-2">{h.reason}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                      <span>{formatDistanceToNow(new Date(h.timestamp), { addSuffix: true })}</span>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-gray-400 mt-1 shrink-0" />
                </div>
              </Link>
            ))
          ) : (
            <p className="p-6 text-sm text-gray-500">No pending hand-offs at the moment.</p>
          )}
        </div>
      </Card>
    </div>
  );
}

