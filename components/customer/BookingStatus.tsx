'use client';

import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import type { BookingStatus as BookingStatusType } from '@/lib/types';

interface BookingStatusProps {
  status: BookingStatusType;
  showIcon?: boolean;
  className?: string;
}

interface StatusConfig {
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const statusConfig: Record<BookingStatusType, StatusConfig> = {
  PENDING: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: Clock,
    description: 'Waiting for provider confirmation'
  },
  CONFIRMED: {
    label: 'Confirmed',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: CheckCircle,
    description: 'Booking confirmed by provider'
  },
  IN_PROGRESS: {
    label: 'In Progress',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: RefreshCw,
    description: 'Service is currently being provided'
  },
  COMPLETED: {
    label: 'Completed',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: CheckCircle,
    description: 'Service has been completed'
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: XCircle,
    description: 'Booking has been cancelled'
  },
  DISPUTED: {
    label: 'Disputed',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: AlertTriangle,
    description: 'There is a dispute regarding this booking'
  },
  REFUNDED: {
    label: 'Refunded',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: RefreshCw,
    description: 'Payment has been refunded'
  }
};

export default function BookingStatus({ 
  status, 
  showIcon = true, 
  className = '' 
}: BookingStatusProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={`${config.color} ${className}`}
    >
      <span className="flex items-center gap-1">
        {showIcon && <Icon className="h-3 w-3" />}
        {config.label}
      </span>
    </Badge>
  );
}

// Extended version with tooltip/description
export function BookingStatusWithTooltip({ 
  status, 
  showIcon = true, 
  className = '',
  showDescription = false
}: BookingStatusProps & { showDescription?: boolean }) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className="relative group">
      <Badge 
        variant="outline" 
        className={`${config.color} ${className}`}
      >
        <span className="flex items-center gap-1">
          {showIcon && <Icon className="h-3 w-3" />}
          {config.label}
        </span>
      </Badge>
      
      {showDescription && (
        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
            {config.description}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  );
}

// Utility function to get next possible statuses
export function getNextStatuses(currentStatus: BookingStatusType): BookingStatusType[] {
  switch (currentStatus) {
    case 'PENDING':
      return ['CONFIRMED', 'CANCELLED'];
    case 'CONFIRMED':
      return ['IN_PROGRESS', 'CANCELLED'];
    case 'IN_PROGRESS':
      return ['COMPLETED', 'DISPUTED'];
    case 'COMPLETED':
      return ['DISPUTED', 'REFUNDED'];
    case 'CANCELLED':
      return [];
    case 'DISPUTED':
      return ['COMPLETED', 'REFUNDED'];
    case 'REFUNDED':
      return [];
    default:
      return [];
  }
}

// Utility function to check if status allows certain actions
export function canCancelBooking(status: BookingStatusType): boolean {
  return ['PENDING', 'CONFIRMED'].includes(status);
}

export function canRescheduleBooking(status: BookingStatusType): boolean {
  return ['PENDING', 'CONFIRMED'].includes(status);
}

export function canReviewBooking(status: BookingStatusType): boolean {
  return status === 'COMPLETED';
}

export function canDisputeBooking(status: BookingStatusType): boolean {
  return ['IN_PROGRESS', 'COMPLETED'].includes(status);
}

export function isActiveBooking(status: BookingStatusType): boolean {
  return !['CANCELLED', 'COMPLETED', 'REFUNDED'].includes(status);
}

// Timeline component for booking status progression
export function BookingStatusTimeline({ 
  currentStatus,
  statusHistory = [],
  className = ''
}: {
  currentStatus: BookingStatusType;
  statusHistory?: Array<{ status: BookingStatusType; timestamp: string; note?: string }>;
  className?: string;
}) {
  const allStatuses: BookingStatusType[] = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'];
  
  return (
    <div className={`space-y-4 ${className}`}>
      <h4 className="font-medium text-gray-900">Booking Progress</h4>
      <div className="space-y-3">
        {allStatuses.map((status, index) => {
          const config = statusConfig[status];
          const Icon = config.icon;
          const isCompleted = allStatuses.indexOf(currentStatus) >= index;
          const isCurrent = currentStatus === status;
          
          return (
            <div key={status} className="flex items-center space-x-3">
              <div className={`
                flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-2
                ${isCurrent 
                  ? 'bg-blue-100 border-blue-500 text-blue-600'
                  : isCompleted 
                  ? 'bg-green-100 border-green-500 text-green-600'
                  : 'bg-gray-100 border-gray-300 text-gray-400'
                }
              `}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className={`
                  font-medium text-sm
                  ${isCurrent 
                    ? 'text-blue-900'
                    : isCompleted 
                    ? 'text-green-900'
                    : 'text-gray-500'
                  }
                `}>
                  {config.label}
                </div>
                <div className="text-xs text-gray-500">
                  {config.description}
                </div>
              </div>
              {isCurrent && (
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}