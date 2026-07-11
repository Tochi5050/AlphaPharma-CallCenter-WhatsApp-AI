'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Phone, Clock, ArrowLeft, CheckCircle, Loader2, Image as ImageIcon, Send } from 'lucide-react';
import { mockConversations } from '@/app/data/mockData';
import { StatusBadge } from '@/components/StatusBadge';
import { format, formatDistanceToNow } from 'date-fns';
import {
  fetchHandoffs,
  fetchHandoff,
  resolveHandoff as apiResolve,
  type HandoffSummary,
  type HandoffRecord,
} from '@/lib/api';


type MockConversation = (typeof mockConversations)[number];

type FilterValue = 'all' | 'new' | 'pending' | 'resolved' | 'awaiting-payment';


function ConversationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filter, setFilter] = useState<FilterValue>('all');


  const [handoffs, setHandoffs] = useState<HandoffSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);


  const [selectedHandoff, setSelectedHandoff] = useState<HandoffRecord | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const [selectedMock, setSelectedMock] = useState<MockConversation | null>(null);

  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);


  const [newComment, setNewComment] = useState('');
  const [localComments, setLocalComments] = useState<Record<string, Array<{
    id: string;
    agentName: string;
    content: string;
    timestamp: Date;
  }>>>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kamsi_dashboard_comments');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          Object.keys(parsed).forEach((key) => {
            parsed[key] = parsed[key].map((c: any) => ({
              ...c,
              timestamp: new Date(c.timestamp),
            }));
          });
          setLocalComments(parsed);
        } catch (e) {
          console.error('Failed to parse saved comments', e);
        }
      }
    }
  }, []);

  const saveComments = (newComments: typeof localComments) => {
    setLocalComments(newComments);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kamsi_dashboard_comments', JSON.stringify(newComments));
    }
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const targetId = isLiveMode ? selectedHandoff?.id : selectedMock?.id;
    if (!targetId) return;

    const newCommentObj = {
      id: Math.random().toString(36).substring(2, 9),
      agentName: 'Sarah Chen',
      content: newComment,
      timestamp: new Date(),
    };

    const updated = {
      ...localComments,
      [targetId]: [...(localComments[targetId] || []), newCommentObj],
    };
    saveComments(updated);
    setNewComment('');
  };


  const isLiveMode = filter !== 'new';


  const loadHandoffs = useCallback(async (f: FilterValue) => {
    if (f === 'new') return; // mock tabs — no API call

    setIsLoading(true);
    try {
      if (f === 'all') {

        const [pendingRes, awaitingRes, resolvedRes] = await Promise.all([
          fetchHandoffs('pending'),
          fetchHandoffs('awaiting_payment'),
          fetchHandoffs('resolved'),
        ]);
        const merged = [
          ...pendingRes.handoffs,
          ...awaitingRes.handoffs,
          ...resolvedRes.handoffs,
        ].sort((a, b) => b.timestamp - a.timestamp);
        setHandoffs(merged);
      } else {

        const apiStatus = f === 'awaiting-payment' ? 'awaiting_payment' : f;
        const res = await fetchHandoffs(apiStatus);
        setHandoffs(res.handoffs);
      }
    } catch {
      setHandoffs([]);
    } finally {
      setIsLoading(false);
    }
  }, []);


  useEffect(() => {
    const urlFilter = searchParams.get('filter') as FilterValue | null;
    const activeFilter: FilterValue =
      urlFilter && ['new', 'pending', 'resolved', 'awaiting-payment', 'all'].includes(urlFilter)
        ? urlFilter
        : 'all';
    setFilter(activeFilter);
    loadHandoffs(activeFilter);

    const urlId = searchParams.get('id');
    if (urlId) {
      setIsMobileDetailOpen(true);

      if (activeFilter === 'new') {
        const mock = mockConversations.find((c) => c.id === urlId) ?? null;
        setSelectedMock(mock);
        setSelectedHandoff(null);
      } else {

        setIsDetailLoading(true);
        fetchHandoff(urlId)
          .then(({ handoff }) => setSelectedHandoff(handoff))
          .catch(() => setSelectedHandoff(null))
          .finally(() => setIsDetailLoading(false));
        setSelectedMock(null);
      }
    } else {
      setSelectedHandoff(null);
      setSelectedMock(null);
      setIsMobileDetailOpen(false);
    }

  }, [searchParams]);


  const mockFilteredConversations = mockConversations
    .filter((c) => {
      if (filter !== 'new') return false;
      if (c.status !== filter) return false;
      if (searchQuery && !c.phoneNumber.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.handoffTime.getTime() - a.handoffTime.getTime());


  const filteredHandoffs = handoffs.filter((h) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      h.waId.toLowerCase().includes(q) ||
      (h.customerName ?? '').toLowerCase().includes(q)
    );
  });


  function pushFilter(f: FilterValue) {
    const params = new URLSearchParams(searchParams.toString());
    if (f === 'all') params.delete('filter');
    else params.set('filter', f);
    params.delete('id');
    router.push(`/conversations?${params.toString()}`, { scroll: false });
    setFilter(f);
    loadHandoffs(f);
    setSelectedHandoff(null);
    setSelectedMock(null);
  }

  function selectLiveHandoff(h: HandoffSummary) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('id', h.id);
    router.push(`/conversations?${params.toString()}`, { scroll: false });
    setIsMobileDetailOpen(true);
    setIsDetailLoading(true);
    setSelectedHandoff(null);
    setSelectedMock(null);
    fetchHandoff(h.id)
      .then(({ handoff }) => setSelectedHandoff(handoff))
      .catch(() => setSelectedHandoff(null))
      .finally(() => setIsDetailLoading(false));
  }

  function selectMockConversation(conv: MockConversation) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('id', conv.id);
    router.push(`/conversations?${params.toString()}`, { scroll: false });
    setSelectedMock(conv);
    setSelectedHandoff(null);
    setIsMobileDetailOpen(true);
  }

  function closeDetail() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('id');
    router.push(`/conversations?${params.toString()}`, { scroll: false });
    setIsMobileDetailOpen(false);
    setSelectedHandoff(null);
    setSelectedMock(null);
  }


  async function handleMarkResolved() {
    if (!selectedHandoff) return;
    setIsResolving(true);
    setResolveError(null);
    try {
      const { handoff: updated } = await apiResolve(selectedHandoff.id);
      setSelectedHandoff(updated);

      await loadHandoffs(filter);
    } catch {
      setResolveError('Failed to resolve â€” please try again.');
    } finally {
      setIsResolving(false);
    }
  }

  return (
    <>
      <div
        className={`w-full md:w-80 lg:w-96 border-r border-gray-200 bg-white flex flex-col shrink-0 ${isMobileDetailOpen ? 'hidden md:flex' : 'flex'
          }`}
      >
        {/* Header */}
        <div className="p-4 lg:p-5 border-b border-gray-200">
          <h1 className="text-xl lg:text-2xl font-semibold text-gray-900 mb-3">Conversations</h1>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by phone / name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0c237c]"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex overflow-x-auto no-scrollbar gap-1.5 pb-1 whitespace-nowrap">
            {(['all', 'new', 'pending', 'awaiting-payment', 'resolved'] as const).map((f) => {
              const label =
                f === 'awaiting-payment'
                  ? 'Payment'
                  : f.charAt(0).toUpperCase() + f.slice(1);
              return (
                <button
                  key={f}
                  onClick={() => pushFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shrink-0 ${filter === f
                      ? 'bg-[#0c237c] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* List body */}
        <div className="flex-1 overflow-y-auto">
          {/* Loading Skeleton */}
          {isLoading && isLiveMode && (
            <div className="animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-4 border-b border-gray-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-32 bg-gray-200 rounded" />
                    <div className="h-5 w-14 bg-gray-200 rounded-full" />
                  </div>
                  <div className="h-3 w-4/5 bg-gray-200 rounded" />
                  <div className="h-3 w-2/3 bg-gray-200 rounded" />
                  <div className="h-2.5 w-20 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && isLiveMode &&
            filteredHandoffs.map((h) => (
              <div
                key={h.id}
                onClick={() => selectLiveHandoff(h)}
                className={`p-4 border-b border-gray-200 cursor-pointer transition-colors ${selectedHandoff?.id === h.id
                    ? 'bg-blue-50 border-l-4 border-l-[#0c237c]'
                    : 'hover:bg-gray-50'
                  }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Phone size={16} className="text-gray-500" />
                    <p className="font-medium text-gray-900">{h.customerName ?? h.waId}</p>
                  </div>
                  <StatusBadge status={h.status} size="sm" />
                </div>
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{h.reason}</p>
                <div className="flex items-center text-xs text-gray-500">
                  <Clock size={12} className="mr-1" />
                  {formatDistanceToNow(new Date(h.timestamp), { addSuffix: true })}
                </div>
              </div>
            ))}

          {/* Empty state for live tabs */}
          {!isLoading && isLiveMode && filteredHandoffs.length === 0 && (
            <div className="p-8 text-center text-gray-500">No conversations found</div>
          )}

          {/* Mock conversations (new + awaiting-payment tabs) */}
          {!isLiveMode &&
            mockFilteredConversations.map((c) => (
              <div
                key={c.id}
                onClick={() => selectMockConversation(c)}
                className={`p-4 border-b border-gray-200 cursor-pointer transition-colors ${selectedMock?.id === c.id
                    ? 'bg-blue-50 border-l-4 border-l-[#0c237c]'
                    : 'hover:bg-gray-50'
                  }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Phone size={16} className="text-gray-500" />
                    <p className="font-medium text-gray-900">{c.phoneNumber}</p>
                  </div>
                  <StatusBadge status={c.status} size="sm" />
                </div>
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{c.handoffReason}</p>
                <div className="flex items-center text-xs text-gray-500" suppressHydrationWarning>
                  <Clock size={12} className="mr-1" />
                  {formatDistanceToNow(c.handoffTime, { addSuffix: true })}
                </div>
              </div>
            ))}

          {!isLiveMode && mockFilteredConversations.length === 0 && (
            <div className="p-8 text-center text-gray-500">No conversations found</div>
          )}
        </div>
      </div>

      <div
        className={`flex-1 bg-gray-50 flex flex-col min-w-0 ${isMobileDetailOpen ? 'flex' : 'hidden md:flex'
          }`}
      >

        {isLiveMode && (isDetailLoading || selectedHandoff) ? (
          <>
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-4 lg:p-5">
              <button
                onClick={closeDetail}
                className="flex items-center gap-2 text-sm text-[#0c237c] hover:text-[#0a1d66] font-medium md:hidden mb-4 px-1 py-1 rounded w-fit transition-colors"
              >
                <ArrowLeft size={18} />
                Back to List
              </button>

              {isDetailLoading ? (
                <div className="animate-pulse space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-48 bg-gray-200 rounded-lg" />
                    <div className="h-5 w-16 bg-gray-200 rounded-full" />
                  </div>
                  <div className="h-4 w-3/4 bg-gray-200 rounded" />
                  <div className="h-3 w-1/3 bg-gray-200 rounded mt-2" />
                </div>
              ) : selectedHandoff && (
                <>
                  <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 leading-tight">
                          {selectedHandoff.customerName ?? selectedHandoff.waId}
                        </h2>
                        <StatusBadge status={selectedHandoff.status} />
                      </div>
                      <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                        {selectedHandoff.reason}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 shrink-0">
                      {selectedHandoff.status !== 'resolved' && (
                        <button
                          onClick={handleMarkResolved}
                          disabled={isResolving}
                          className="flex items-center gap-2 px-3 py-2 text-xs sm:text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isResolving ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <CheckCircle size={15} />
                          )}
                          <span className="hidden xl:inline">Mark as </span>Resolved
                        </button>
                      )}
                    </div>
                  </div>

                  {resolveError && (
                    <p className="text-sm text-red-600 mb-3">{resolveError}</p>
                  )}

                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs sm:text-sm text-gray-600 border-t border-gray-100 pt-3 mt-3 sm:border-0 sm:pt-0 sm:mt-0">
                    <div>
                      <span className="font-medium">Category:</span>{' '}
                      <span className="capitalize">{selectedHandoff.category.replace(/_/g, ' ')}</span>
                    </div>
                    <div suppressHydrationWarning>
                      <span className="font-medium">Handoff Time:</span>{' '}
                      {format(new Date(selectedHandoff.timestamp), 'PPp')}
                    </div>
                    {selectedHandoff.resolvedAt && (
                      <div suppressHydrationWarning>
                        <span className="font-medium">Resolved At:</span>{' '}
                        {format(new Date(selectedHandoff.resolvedAt), 'PPp')}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Detail body */}
            {isDetailLoading ? (
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 space-y-3 lg:space-y-4 animate-pulse">
                {/* Attached Media Skeleton */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-5 space-y-3">
                  <div className="h-4 w-32 bg-gray-200 rounded" />
                  <div className="h-40 w-full bg-gray-100 rounded-lg" />
                </div>

                {/* Chat Transcript Skeleton */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-5 space-y-4">
                  <div className="h-4 w-36 bg-gray-200 rounded mb-4" />
                  <div className="flex justify-start">
                    <div className="w-2/3 bg-gray-100 rounded-lg p-3 space-y-2">
                      <div className="h-2.5 w-12 bg-gray-200 rounded" />
                      <div className="h-3.5 w-5/6 bg-gray-200 rounded" />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="w-2/3 bg-blue-50/50 border border-blue-100 rounded-lg p-3 space-y-2">
                      <div className="h-2.5 w-16 bg-blue-100/60 rounded" />
                      <div className="h-3.5 w-4/5 bg-blue-100/60 rounded" />
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="w-1/2 bg-gray-100 rounded-lg p-3 space-y-2">
                      <div className="h-2.5 w-12 bg-gray-200 rounded" />
                      <div className="h-3.5 w-3/4 bg-gray-200 rounded" />
                    </div>
                  </div>
                </div>

                {/* Comments card Skeleton */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-5 space-y-3">
                  <div className="h-4 w-32 bg-gray-200 rounded" />
                  <div className="h-10 w-full bg-gray-100 rounded-lg" />
                </div>
              </div>
            ) : selectedHandoff && (
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 space-y-3 lg:space-y-4">
                {/* Media preview */}
                {selectedHandoff.mediaUrl && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-5">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <ImageIcon size={16} />
                      Attached Media
                    </h3>
                    {selectedHandoff.mediaType?.startsWith('image/') ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selectedHandoff.mediaUrl}
                        alt="Customer attachment"
                        className="max-h-64 rounded-lg border border-gray-200 object-contain"
                      />
                    ) : (
                      <a
                        href={selectedHandoff.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#0c237c] underline text-sm"
                      >
                        View attachment ({selectedHandoff.mediaType ?? 'file'})
                      </a>
                    )}
                    {selectedHandoff.originalText && (
                      <p className="mt-2 text-sm text-gray-600 italic">
                        &ldquo;{selectedHandoff.originalText}&rdquo;
                      </p>
                    )}
                  </div>
                )}

                {/* Order details (payment_proof tickets) */}
                {selectedHandoff.orderDetails && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-5">
                    <h3 className="font-semibold text-gray-900 mb-3">Order Details</h3>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500 border-b border-gray-100">
                          <th className="pb-2 font-medium">Item</th>
                          <th className="pb-2 font-medium">UOM</th>
                          <th className="pb-2 font-medium text-right">Qty</th>
                          <th className="pb-2 font-medium text-right">Unit â‚¦</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedHandoff.orderDetails.items.map((item, i) => (
                          <tr key={i}>
                            <td className="py-2 text-gray-900">{item.item_name}</td>
                            <td className="py-2 text-gray-600">{item.uom}</td>
                            <td className="py-2 text-right text-gray-900">{item.qty}</td>
                            <td className="py-2 text-right text-gray-900">
                              {item.unit_price.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-gray-200">
                          <td colSpan={3} className="pt-2 font-semibold text-gray-900">Total</td>
                          <td className="pt-2 text-right font-semibold text-gray-900">
                            â‚¦{selectedHandoff.orderDetails.total.toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                {/* Chat transcript */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-5">
                  <h3 className="font-semibold text-gray-900 mb-3">Chat Transcript</h3>
                  <div className="space-y-3">
                    {selectedHandoff.conversationSnapshot.length === 0 && (
                      <p className="text-sm text-gray-500">No messages in snapshot.</p>
                    )}
                    {selectedHandoff.conversationSnapshot.map((msg, idx) => {
                      const isUser = msg.role === 'user';
                      const isAssistant = msg.role === 'assistant';

                      if (isUser) {
                        return (
                          <div key={idx} className="flex justify-start">
                            <div className="max-w-[85%] sm:max-w-[70%] bg-gray-100 rounded-lg p-2.5 sm:p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-gray-600">Customer</span>
                              </div>
                              <p className="text-gray-900 text-sm sm:text-base">{msg.content}</p>
                            </div>
                          </div>
                        );
                      }

                      if (isAssistant) {
                        return (
                          <div key={idx} className="flex justify-end">
                            <div className="max-w-[85%] sm:max-w-[70%] bg-blue-50 border border-blue-200 rounded-lg p-2.5 sm:p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-blue-700">AI Assistant</span>
                              </div>
                              <p className="text-gray-900 text-sm sm:text-base">{msg.content}</p>
                            </div>
                          </div>
                        );
                      }

                      // system / other roles
                      return (
                        <div key={idx} className="flex justify-center">
                          <div className="max-w-[95%] sm:max-w-[80%] bg-gray-50 border-2 border-gray-300 rounded-lg p-2.5 sm:p-3">
                            <span className="text-xs font-medium text-gray-700 uppercase">System</span>
                            <p className="text-gray-900 text-sm mt-1">{msg.content}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Internal Comments */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-5">
                  <h3 className="font-semibold text-gray-900 mb-3">Internal Comments</h3>

                  {/* Comment History */}
                  <div className="space-y-2.5 mb-3">
                    {localComments[selectedHandoff.id] && localComments[selectedHandoff.id].length > 0 ? (
                      localComments[selectedHandoff.id].map((comment) => (
                        <div key={comment.id} className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 sm:p-3">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
                            <span className="font-medium text-gray-900 text-sm">{comment.agentName}</span>
                            <span className="text-xs text-gray-500" suppressHydrationWarning>
                              {format(comment.timestamp, 'PPp')}
                            </span>
                          </div>
                          <p className="text-gray-700 text-sm">{comment.content}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">No comments yet</p>
                    )}
                  </div>

                  {/* Add Comment */}
                  <div className="space-y-2.5">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add an internal note about this conversation..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0c237c] resize-none text-sm"
                      rows={2}
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-[#0c237c] text-white rounded-lg hover:bg-[#0a1d66] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      <Send size={16} />
                      Add Comment
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : isLiveMode ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a conversation to view details
          </div>
        ) : null}

        {/* â”€â”€ MOCK TICKET DETAIL (new / awaiting-payment tabs) â”€â”€ */}
        {!isLiveMode && selectedMock ? (
          <>
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-4 lg:p-5">
              <button
                onClick={closeDetail}
                className="flex items-center gap-2 text-sm text-[#0c237c] hover:text-[#0a1d66] font-medium md:hidden mb-4 px-1 py-1 rounded w-fit transition-colors"
              >
                <ArrowLeft size={18} />
                Back to List
              </button>

              <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 leading-tight">
                      {selectedMock.phoneNumber}
                    </h2>
                    <StatusBadge status={selectedMock.status} />
                  </div>
                  <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                    {selectedMock.handoffReason}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs sm:text-sm text-gray-600 border-t border-gray-100 pt-3 mt-3 sm:border-0 sm:pt-0 sm:mt-0">
                <div>
                  <span className="font-medium">AI Confidence:</span>{' '}
                  <span className={selectedMock.aiConfidence < 0.5 ? 'text-red-600' : 'text-green-600'}>
                    {(selectedMock.aiConfidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div suppressHydrationWarning>
                  <span className="font-medium">Handoff Time:</span>{' '}
                  {format(selectedMock.handoffTime, 'PPp')}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 space-y-3 lg:space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Chat Transcript</h3>
                <div className="space-y-3">
                  {selectedMock.messages.map((message) => (
                    <div key={message.id}>
                      {message.sender === 'customer' && (
                        <div className="flex justify-start">
                          <div className="max-w-[85%] sm:max-w-[70%] bg-gray-100 rounded-lg p-2.5 sm:p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-gray-600">Customer</span>
                              <span className="text-xs text-gray-500" suppressHydrationWarning>
                                {format(message.timestamp, 'p')}
                              </span>
                            </div>
                            <p className="text-gray-900 text-sm sm:text-base">{message.content}</p>
                          </div>
                        </div>
                      )}
                      {message.sender === 'ai' && (
                        <div className="flex justify-end">
                          <div className="max-w-[85%] sm:max-w-[70%] bg-blue-50 border border-blue-200 rounded-lg p-2.5 sm:p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-blue-700">AI Assistant</span>
                              <span className="text-xs text-blue-600" suppressHydrationWarning>
                                {format(message.timestamp, 'p')}
                              </span>
                            </div>
                            <p className="text-gray-900 text-sm sm:text-base">{message.content}</p>
                          </div>
                        </div>
                      )}
                      {message.sender === 'system' && message.metadata && (
                        <div className="flex justify-center">
                          <div className="max-w-[95%] sm:max-w-[80%] bg-gray-50 border-2 border-gray-300 rounded-lg p-2.5 sm:p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-medium text-gray-700 uppercase">
                                {message.metadata.type} System
                              </span>
                              <span className="text-xs text-gray-500" suppressHydrationWarning>
                                {format(message.timestamp, 'p')}
                              </span>
                            </div>
                            <div className="bg-white rounded p-2 sm:p-2.5 text-xs sm:text-sm">
                              <p className="font-semibold text-gray-900 mb-2">{message.content}</p>
                              {message.metadata.type === 'erp' && (
                                <div className="space-y-1 text-gray-700">
                                  <p>SKU: {message.metadata.data.sku}</p>
                                  <p>Available: {message.metadata.data.available} units</p>
                                  <p>Unit Price: ${message.metadata.data.unitPrice}</p>
                                  <p className="font-semibold">
                                    Total: ${message.metadata.data.totalPrice.toFixed(2)}
                                  </p>
                                </div>
                              )}
                              {message.metadata.type === 'payment' && (
                                <div className="space-y-1 text-gray-700">
                                  <p>Order ID: {message.metadata.data.orderId}</p>
                                  <p>Amount: ${message.metadata.data.amount}</p>
                                  <p>
                                    Status:{' '}
                                    <span className="text-red-600 font-medium">
                                      {message.metadata.data.status}
                                    </span>
                                  </p>
                                  <p>Reason: {message.metadata.data.reason}</p>
                                  <p>Attempts: {message.metadata.data.attempts}</p>
                                </div>
                              )}
                              {message.metadata.type === 'delivery' && (
                                <div className="space-y-1 text-gray-700">
                                  <p>Order ID: {message.metadata.data.orderId}</p>
                                  <p>Address: {message.metadata.data.address}</p>
                                  <p>Special: {message.metadata.data.specialInstructions}</p>
                                  <p>Est. Delivery: {message.metadata.data.estimatedDelivery}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Internal Comments */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Internal Comments</h3>
                <div className="space-y-2.5 mb-3">
                  {selectedMock.comments.length > 0 || (localComments[selectedMock.id] && localComments[selectedMock.id].length > 0) ? (
                    <>
                      {/* Original mock comments */}
                      {selectedMock.comments.map((comment) => (
                        <div key={comment.id} className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 sm:p-3">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
                            <span className="font-medium text-gray-900 text-sm">{comment.agentName}</span>
                            <span className="text-xs text-gray-500" suppressHydrationWarning>
                              {format(comment.timestamp, 'PPp')}
                            </span>
                          </div>
                          <p className="text-gray-700 text-sm">{comment.content}</p>
                        </div>
                      ))}
                      {/* Added local comments */}
                      {(localComments[selectedMock.id] || []).map((comment) => (
                        <div key={comment.id} className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 sm:p-3">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
                            <span className="font-medium text-gray-900 text-sm">{comment.agentName}</span>
                            <span className="text-xs text-gray-500" suppressHydrationWarning>
                              {format(comment.timestamp, 'PPp')}
                            </span>
                          </div>
                          <p className="text-gray-700 text-sm">{comment.content}</p>
                        </div>
                      ))}
                    </>
                  ) : (
                    <p className="text-gray-500 text-sm">No comments yet</p>
                  )}
                </div>

                {/* Add Comment */}
                <div className="space-y-2.5">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add an internal note about this conversation..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0c237c] resize-none text-sm"
                    rows={2}
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-[#0c237c] text-white rounded-lg hover:bg-[#0a1d66] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    <Send size={16} />
                    Add Comment
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : !isLiveMode ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a conversation to view details
          </div>
        ) : null}
      </div>
    </>
  );
}

const ConversationsClient = () => {
  return (
    <Suspense fallback={<div className="p-8 text-gray-500">Loading...</div>}>
      <ConversationsContent />
    </Suspense>
  );
};

export default ConversationsClient;

