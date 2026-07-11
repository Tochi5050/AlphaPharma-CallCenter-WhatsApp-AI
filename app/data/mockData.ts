export interface Message {
  id: string;
  sender: 'customer' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    type?: 'payment' | 'delivery' | 'erp';
    data?: any;
  };
}

export interface Conversation {
  id: string;
  phoneNumber: string;
  status: 'new' | 'pending' | 'resolved' | 'awaiting-payment';
  aiConfidence: number;
  handoffReason: string;
  handoffTime: Date;
  messages: Message[];
  comments: Comment[];
}

export interface Comment {
  id: string;
  conversationId: string;
  agentName: string;
  content: string;
  timestamp: Date;
}

export interface ActivityLog {
  id: string;
  conversationId: string;
  agentName: string;
  action: string;
  timestamp: Date;
  details?: string;
}

export interface Userdetails {
  id: string;
  name: string;
  email: string;
  role: string;
  notificationsEnabled: boolean;
}

// Mock Conversations
export const mockConversations: Conversation[] = [
  {
    id: '1',
    phoneNumber: '+1 (555) 123-4567',
    status: 'new',
    aiConfidence: 0.45,
    handoffReason: 'Customer requesting bulk discount beyond AI authorization',
    handoffTime: new Date('2026-02-20T14:30:00'),
    messages: [
      {
        id: 'm1',
        sender: 'customer',
        content: 'Hi, I need to order 500 units of product SKU-1234',
        timestamp: new Date('2026-02-20T14:25:00'),
      },
      {
        id: 'm2',
        sender: 'ai',
        content: 'Hello! I can help you with that order. Let me check the availability for SKU-1234.',
        timestamp: new Date('2026-02-20T14:25:15'),
      },
      {
        id: 'm3',
        sender: 'system',
        content: 'ERP Lookup Result',
        timestamp: new Date('2026-02-20T14:25:20'),
        metadata: {
          type: 'erp',
          data: {
            sku: 'SKU-1234',
            available: 750,
            unitPrice: 24.99,
            totalPrice: 12495.00,
          },
        },
      },
      {
        id: 'm4',
        sender: 'ai',
        content: 'Great news! We have 750 units available. The total would be $12,495.00 at $24.99 per unit.',
        timestamp: new Date('2026-02-20T14:25:25'),
      },
      {
        id: 'm5',
        sender: 'customer',
        content: 'Can I get a bulk discount? I\'m ordering a large quantity.',
        timestamp: new Date('2026-02-20T14:26:00'),
      },
      {
        id: 'm6',
        sender: 'ai',
        content: 'I understand you\'re looking for a bulk discount. Let me connect you with our sales team who can provide you with the best pricing for your order.',
        timestamp: new Date('2026-02-20T14:26:15'),
      },
    ],
    comments: [
      {
        id: 'c1',
        conversationId: '1',
        agentName: 'Sarah Chen',
        content: 'Customer is a potential high-value account. Check if they have ordered before.',
        timestamp: new Date('2026-02-20T14:35:00'),
      },
    ],
  },
  {
    id: '2',
    phoneNumber: '+1 (555) 234-5678',
    status: 'awaiting-payment',
    aiConfidence: 0.62,
    handoffReason: 'Payment verification required for international order',
    handoffTime: new Date('2026-02-20T13:15:00'),
    messages: [
      {
        id: 'm1',
        sender: 'customer',
        content: 'I placed an order yesterday but payment failed. Can you help?',
        timestamp: new Date('2026-02-20T13:10:00'),
      },
      {
        id: 'm2',
        sender: 'ai',
        content: 'I\'ll help you with that. Can you provide your order number?',
        timestamp: new Date('2026-02-20T13:10:10'),
      },
      {
        id: 'm3',
        sender: 'customer',
        content: 'Order #ORD-45678',
        timestamp: new Date('2026-02-20T13:10:30'),
      },
      {
        id: 'm4',
        sender: 'system',
        content: 'Payment Log',
        timestamp: new Date('2026-02-20T13:10:35'),
        metadata: {
          type: 'payment',
          data: {
            orderId: 'ORD-45678',
            amount: 299.99,
            status: 'failed',
            reason: 'Card declined - International transaction blocked',
            attempts: 2,
          },
        },
      },
      {
        id: 'm5',
        sender: 'ai',
        content: 'I can see your payment was declined due to international transaction restrictions. This requires manual verification from our team.',
        timestamp: new Date('2026-02-20T13:11:00'),
      },
    ],
    comments: [
      {
        id: 'c1',
        conversationId: '2',
        agentName: 'Mike Rodriguez',
        content: 'Contacted customer via WhatsApp. Waiting for alternative payment method.',
        timestamp: new Date('2026-02-20T13:45:00'),
      },
      {
        id: 'c2',
        conversationId: '2',
        agentName: 'Mike Rodriguez',
        content: 'Customer will use PayPal instead. Processing payment link.',
        timestamp: new Date('2026-02-20T14:20:00'),
      },
    ],
  },
  {
    id: '3',
    phoneNumber: '+1 (555) 345-6789',
    status: 'resolved',
    aiConfidence: 0.78,
    handoffReason: 'Custom shipping arrangement needed',
    handoffTime: new Date('2026-02-20T10:00:00'),
    messages: [
      {
        id: 'm1',
        sender: 'customer',
        content: 'I need special delivery to a construction site',
        timestamp: new Date('2026-02-20T09:55:00'),
      },
      {
        id: 'm2',
        sender: 'ai',
        content: 'I can help with delivery arrangements. Let me connect you with our logistics team for construction site deliveries.',
        timestamp: new Date('2026-02-20T09:55:15'),
      },
      {
        id: 'm3',
        sender: 'system',
        content: 'Delivery Log',
        timestamp: new Date('2026-02-20T09:55:20'),
        metadata: {
          type: 'delivery',
          data: {
            orderId: 'ORD-45677',
            address: '456 Construction Ave, Building Site 3',
            specialInstructions: 'Require forklift access and morning delivery only',
            estimatedDelivery: '2026-02-25',
          },
        },
      },
    ],
    comments: [
      {
        id: 'c1',
        conversationId: '3',
        agentName: 'Sarah Chen',
        content: 'Arranged morning delivery with forklift. Customer confirmed.',
        timestamp: new Date('2026-02-20T10:30:00'),
      },
      {
        id: 'c2',
        conversationId: '3',
        agentName: 'Sarah Chen',
        content: 'Marked as resolved. Delivery scheduled for Feb 25, 8 AM.',
        timestamp: new Date('2026-02-20T10:35:00'),
      },
    ],
  },
  {
    id: '4',
    phoneNumber: '+1 (555) 456-7890',
    status: 'new',
    aiConfidence: 0.38,
    handoffReason: 'Product customization request outside standard catalog',
    handoffTime: new Date('2026-02-20T14:45:00'),
    messages: [
      {
        id: 'm1',
        sender: 'customer',
        content: 'Do you offer custom branding on your products?',
        timestamp: new Date('2026-02-20T14:40:00'),
      },
      {
        id: 'm2',
        sender: 'ai',
        content: 'We do offer some customization options. Let me connect you with our custom solutions team who can discuss your specific requirements.',
        timestamp: new Date('2026-02-20T14:40:20'),
      },
    ],
    comments: [],
  },
  {
    id: '5',
    phoneNumber: '+1 (555) 567-8901',
    status: 'pending',
    aiConfidence: 0.55,
    handoffReason: 'Return authorization for damaged goods',
    handoffTime: new Date('2026-02-20T12:00:00'),
    messages: [
      {
        id: 'm1',
        sender: 'customer',
        content: 'I received damaged items in my last order',
        timestamp: new Date('2026-02-20T11:55:00'),
      },
      {
        id: 'm2',
        sender: 'ai',
        content: 'I\'m sorry to hear that. Let me help you with a return. Which items were damaged?',
        timestamp: new Date('2026-02-20T11:55:10'),
      },
      {
        id: 'm3',
        sender: 'customer',
        content: '3 items from order ORD-45680 - all boxes were crushed',
        timestamp: new Date('2026-02-20T11:55:30'),
      },
    ],
    comments: [
      {
        id: 'c1',
        conversationId: '5',
        agentName: 'Lisa Park',
        content: 'Reviewing order photos. Will process full refund and reship.',
        timestamp: new Date('2026-02-20T12:30:00'),
      },
    ],
  },
  {
    id: '6',
    phoneNumber: '+1 (555) 678-9012',
    status: 'resolved',
    aiConfidence: 0.71,
    handoffReason: 'Contract negotiation for recurring orders',
    handoffTime: new Date('2026-02-19T16:30:00'),
    messages: [
      {
        id: 'm1',
        sender: 'customer',
        content: 'We want to set up monthly recurring orders. Can we get a contract?',
        timestamp: new Date('2026-02-19T16:25:00'),
      },
      {
        id: 'm2',
        sender: 'ai',
        content: 'That\'s great! Let me connect you with our account management team to discuss a contract for recurring orders.',
        timestamp: new Date('2026-02-19T16:25:15'),
      },
    ],
    comments: [
      {
        id: 'c1',
        conversationId: '6',
        agentName: 'Mike Rodriguez',
        content: 'Sent contract template. Customer reviewing terms.',
        timestamp: new Date('2026-02-19T17:00:00'),
      },
      {
        id: 'c2',
        conversationId: '6',
        agentName: 'Mike Rodriguez',
        content: 'Contract signed. Set up monthly billing cycle.',
        timestamp: new Date('2026-02-20T09:00:00'),
      },
    ],
  },
  {
    id: '7',
    phoneNumber: '+1 (555) 789-0123',
    status: 'awaiting-payment',
    aiConfidence: 0.68,
    handoffReason: 'Large order requires payment confirmation before processing',
    handoffTime: new Date('2026-02-20T15:00:00'),
    messages: [
      {
        id: 'm1',
        sender: 'customer',
        content: 'I want to place a bulk order for 1000 units',
        timestamp: new Date('2026-02-20T14:55:00'),
      },
      {
        id: 'm2',
        sender: 'ai',
        content: 'Great! For bulk orders of this size, I\'ll need to connect you with our sales team to confirm payment and processing.',
        timestamp: new Date('2026-02-20T14:55:20'),
      },
      {
        id: 'm3',
        sender: 'system',
        content: 'Payment Log',
        timestamp: new Date('2026-02-20T14:56:00'),
        metadata: {
          type: 'payment',
          data: {
            orderId: 'ORD-45681',
            amount: 24990.00,
            status: 'pending',
            reason: 'Awaiting wire transfer confirmation',
            attempts: 0,
          },
        },
      },
    ],
    comments: [
      {
        id: 'c1',
        conversationId: '7',
        agentName: 'Sarah Chen',
        content: 'Sent wire transfer instructions. Waiting for payment confirmation.',
        timestamp: new Date('2026-02-20T15:10:00'),
      },
    ],
  },
];

// Mock Activity Logs
export const mockActivityLogs: ActivityLog[] = [
  {
    id: 'a1',
    conversationId: '3',
    agentName: 'Sarah Chen',
    action: 'Status changed to Resolved',
    timestamp: new Date('2026-02-20T10:35:00'),
    details: 'Delivery scheduled and confirmed with customer',
  },
  {
    id: 'a2',
    conversationId: '3',
    agentName: 'Sarah Chen',
    action: 'Added comment',
    timestamp: new Date('2026-02-20T10:30:00'),
    details: 'Arranged morning delivery with forklift',
  },
  {
    id: 'a3',
    conversationId: '2',
    agentName: 'Mike Rodriguez',
    action: 'Added comment',
    timestamp: new Date('2026-02-20T14:20:00'),
    details: 'Customer will use PayPal instead',
  },
  {
    id: 'a4',
    conversationId: '2',
    agentName: 'Mike Rodriguez',
    action: 'Added comment',
    timestamp: new Date('2026-02-20T13:45:00'),
    details: 'Contacted customer via WhatsApp',
  },
  {
    id: 'a5',
    conversationId: '2',
    agentName: 'Mike Rodriguez',
    action: 'Status changed to Pending',
    timestamp: new Date('2026-02-20T13:15:00'),
    details: 'Awaiting payment verification',
  },
  {
    id: 'a6',
    conversationId: '5',
    agentName: 'Lisa Park',
    action: 'Added comment',
    timestamp: new Date('2026-02-20T12:30:00'),
    details: 'Reviewing order photos',
  },
  {
    id: 'a7',
    conversationId: '5',
    agentName: 'Lisa Park',
    action: 'Status changed to Pending',
    timestamp: new Date('2026-02-20T12:00:00'),
    details: 'Return authorization required',
  },
  {
    id: 'a8',
    conversationId: '1',
    agentName: 'Sarah Chen',
    action: 'Added comment',
    timestamp: new Date('2026-02-20T14:35:00'),
    details: 'Customer is a potential high-value account',
  },
  {
    id: 'a9',
    conversationId: '6',
    agentName: 'Mike Rodriguez',
    action: 'Status changed to Resolved',
    timestamp: new Date('2026-02-20T09:00:00'),
    details: 'Contract signed and monthly billing set up',
  },
  {
    id: 'a10',
    conversationId: '6',
    agentName: 'Mike Rodriguez',
    action: 'Added comment',
    timestamp: new Date('2026-02-19T17:00:00'),
    details: 'Sent contract template',
  },
  {
    id: 'a11',
    conversationId: '7',
    agentName: 'Sarah Chen',
    action: 'Added comment',
    timestamp: new Date('2026-02-20T15:10:00'),
    details: 'Sent wire transfer instructions',
  },
];


export const mockUserdetails: Userdetails[] = [
  {
  id: '1',
  name: 'Ifunanya fine girl',
  email: 'iokeke@alphapharmacyltd.com',
  role: 'Customer Support Agent',
  notificationsEnabled: true,
},
  {
  id: '2',
  name: 'Miss Chisom',
  email: 'chisomk@alphapharmacyltd.com',
  role: 'Sleeper Agent',
  notificationsEnabled: true,
},
  {
  id: '3',
  name: 'Hafsat Tahir',
  email: 'htahir@alphapharmacyltd.com',
  role: 'Locum',
  notificationsEnabled: false,
},
  ];
