export const SERVICE_CATEGORIES = [
  { value: 'health-wellness', label: 'Health & Wellness' },
  { value: 'sports-fitness', label: 'Sports & Fitness' },
  { value: 'home-services', label: 'Home Services' },
  { value: 'creative-arts', label: 'Creative & Arts' },
  { value: 'tutoring-education', label: 'Tutoring & Education' },
  { value: 'event-services', label: 'Event Services' },
  { value: 'business-consulting', label: 'Business Consulting' },
  { value: 'beauty-grooming', label: 'Beauty & Grooming' },
  { value: 'tech-digital', label: 'Technology & Digital' },
  { value: 'automotive', label: 'Automotive' }
] as const;

export const MAX_CATEGORIES = 5;

export type ServiceCategory = typeof SERVICE_CATEGORIES[number]['value'];