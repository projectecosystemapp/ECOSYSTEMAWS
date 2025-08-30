// Booking system types
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export interface Booking {
  id: string;
  serviceId: string;
  customerEmail: string;
  providerEmail: string;
  scheduledDate: string;
  scheduledTime: string;
  status: BookingStatus;
  totalAmount: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Service {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  providerName: string;
  providerEmail: string;
  duration: number;
  active: boolean;
  // Location fields
  serviceAddress?: string;
  serviceCity?: string;
  serviceState?: string;
  serviceZipCode?: string;
  serviceRadius?: number;
  latitude?: number;
  longitude?: number;
  locationType?: 'PROVIDER_LOCATION' | 'CUSTOMER_LOCATION' | 'BOTH';
  createdAt?: string;
  updatedAt?: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface BookingFormData {
  selectedDate: Date;
  selectedTime: string;
  notes?: string;
}

// Commission breakdown
export interface PriceBreakdown {
  servicePrice: number;
  platformCommission: number;
  providerAmount: number;
  totalAmount: number;
}

// Utility function to calculate price breakdown
export const calculatePriceBreakdown = (servicePrice: number): PriceBreakdown => {
  const platformCommission = servicePrice * 0.08; // 8% commission
  const providerAmount = servicePrice * 0.92; // Provider gets 92%
  
  return {
    servicePrice,
    platformCommission,
    providerAmount,
    totalAmount: servicePrice
  };
};

// Available time slots (9 AM - 6 PM)
export const TIME_SLOTS: TimeSlot[] = [
  { time: '09:00', available: true },
  { time: '10:00', available: true },
  { time: '11:00', available: true },
  { time: '12:00', available: true },
  { time: '13:00', available: true },
  { time: '14:00', available: true },
  { time: '15:00', available: true },
  { time: '16:00', available: true },
  { time: '17:00', available: true },
  { time: '18:00', available: true },
];

// Utility function to format time for display
export const formatTimeSlot = (time: string): string => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
};

// Utility function to check if a date is available (not weekends, not past dates)
export const isDateAvailable = (date: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Check if date is in the past
  if (date < today) return false;
  
  // Check if it's a weekend (Saturday = 6, Sunday = 0)
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return false;
  
  return true;
};

// Service categories
export const SERVICE_CATEGORIES = [
  'Home Services',
  'Business',
  'Events',
  'Fitness',
  'Creative',
  'Automotive',
  'Health',
  'Photography',
  'Technology',
  'Education',
  'Beauty',
  'Pet Services',
  'Legal',
  'Financial',
  'Other'
] as const;

// Service form data interface
export interface ServiceFormData {
  title: string;
  description: string;
  price: number;
  category: string;
  duration: number;
  active: boolean;
  // Location fields
  serviceAddress?: string;
  serviceCity?: string;
  serviceState?: string;
  serviceZipCode?: string;
  serviceRadius?: number;
  locationType?: 'PROVIDER_LOCATION' | 'CUSTOMER_LOCATION' | 'BOTH';
}

// Form validation errors
export interface FormErrors {
  title?: string;
  description?: string;
  price?: string;
  category?: string;
  duration?: string;
  serviceAddress?: string;
  serviceCity?: string;
  serviceState?: string;
  serviceZipCode?: string;
  serviceRadius?: string;
  locationType?: string;
  general?: string;
  [key: string]: string | undefined;
}

// Provider stats interface
export interface ProviderStats {
  totalServices: number;
  activeServices: number;
  totalBookings: number;
  activeBookings: number;
  totalEarnings: number;
  monthlyEarnings: number;
}

// Loading states interface
export interface LoadingStates {
  services: boolean;
  bookings: boolean;
  stats: boolean;
  saving: boolean;
  deleting: boolean;
}

// Utility function to format date for API
export const formatDateForAPI = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Utility function to get booking status color
export const getStatusColor = (status: BookingStatus): string => {
  switch (status) {
    case 'PENDING':
      return 'text-yellow-600 bg-yellow-100';
    case 'CONFIRMED':
      return 'text-blue-600 bg-blue-100';
    case 'COMPLETED':
      return 'text-green-600 bg-green-100';
    case 'CANCELLED':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

// Utility function to get status display text
export const getStatusText = (status: BookingStatus): string => {
  switch (status) {
    case 'PENDING':
      return 'Pending';
    case 'CONFIRMED':
      return 'Confirmed';
    case 'COMPLETED':
      return 'Completed';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status;
  }
};

// Review system types
export interface Review {
  id: string;
  serviceId: string;
  bookingId: string;
  customerEmail: string;
  providerEmail: string;
  rating: number; // 1-5
  comment?: string;
  providerResponse?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReviewFormData {
  rating: number;
  comment: string;
}

export interface ServiceRating {
  averageRating: number;
  reviewCount: number;
}

export interface ProviderRating {
  averageRating: number;
  reviewCount: number;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

// Enhanced Service interface with review data
export interface ServiceWithRating extends Service {
  rating: number;
  reviewCount: number;
}

// Utility function to calculate review stats
export const calculateReviewStats = (reviews: Review[]): ReviewStats => {
  if (reviews.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    };
  }

  const totalReviews = reviews.length;
  const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews;
  
  const ratingBreakdown = reviews.reduce((acc, review) => {
    acc[review.rating as keyof typeof acc]++;
    return acc;
  }, { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });

  return {
    averageRating: Math.round(averageRating * 10) / 10,
    totalReviews,
    ratingBreakdown
  };
};

// Utility function to format rating for display
export const formatRating = (rating: number): string => {
  if (rating === 0) return 'No rating';
  return rating.toFixed(1);
};

// Messaging system types
export interface Message {
  id: string;
  conversationId: string;
  senderEmail: string;
  recipientEmail: string;
  content: string;
  read: boolean;
  bookingId?: string;
  serviceId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Conversation {
  id: string;
  conversationId: string;
  participants: string[];
  lastMessage: Message;
  unreadCount: number;
  otherParticipant: string;
  otherParticipantName?: string;
}

export interface MessageFormData {
  content: string;
}

// Utility function to format message timestamp
export const formatMessageTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 1) {
    const diffInMinutes = Math.floor(diffInHours * 60);
    return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return `${Math.floor(diffInHours)}h ago`;
  } else if (diffInHours < 48) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString();
  }
};

// Utility function to format full message timestamp
export const formatFullMessageTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

// Utility function to truncate long messages for preview
export const truncateMessage = (content: string, maxLength: number = 50): string => {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength) + '...';
};