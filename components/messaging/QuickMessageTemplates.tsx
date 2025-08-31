'use client';

interface QuickMessageTemplatesProps {
  onSelectTemplate: (message: string) => void;
  serviceTitle?: string;
  className?: string;
}

const QUICK_MESSAGE_TEMPLATES = [
  {
    id: 'availability',
    label: 'Check Availability',
    template: (serviceTitle?: string) => 
      `Hi! I'm interested in ${serviceTitle || 'your service'}. Are you available for a booking?`
  },
  {
    id: 'pricing',
    label: 'Ask About Pricing',
    template: (serviceTitle?: string) => 
      `Hello! Could you provide more details about pricing for ${serviceTitle || 'your service'}?`
  },
  {
    id: 'custom_request',
    label: 'Custom Request',
    template: (serviceTitle?: string) => 
      `Hi! I have a specific request for ${serviceTitle || 'your service'}. Could we discuss the details?`
  },
  {
    id: 'location',
    label: 'Location & Travel',
    template: () => 
      `Hello! I wanted to confirm the location and if there are any travel requirements for the service.`
  },
  {
    id: 'duration',
    label: 'Duration & Schedule',
    template: (serviceTitle?: string) => 
      `Hi! Could you tell me more about the duration and scheduling options for ${serviceTitle || 'your service'}?`
  },
  {
    id: 'preparation',
    label: 'What to Prepare',
    template: () => 
      `Hello! What should I prepare or bring for the service? Any specific requirements?`
  }
];

export default function QuickMessageTemplates({
  onSelectTemplate,
  serviceTitle,
  className
}: QuickMessageTemplatesProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="text-sm font-medium text-gray-700 mb-3">
        Quick message templates:
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {QUICK_MESSAGE_TEMPLATES.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelectTemplate(template.template(serviceTitle))}
            className="text-left p-3 text-sm border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <div className="font-medium text-gray-900 mb-1">
              {template.label}
            </div>
            <div className="text-gray-600 text-xs line-clamp-2">
              {template.template(serviceTitle)}
            </div>
          </button>
        ))}
      </div>
      
      <div className="text-xs text-gray-500 mt-3">
        Click a template to use it as your message starting point
      </div>
    </div>
  );
}