import { ServiceRequestForm } from '@/components/iso/service-request-form';

export default function ISOPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">In Search Of (ISO)</h1>
          <p className="text-muted-foreground">
            Post what you need and let qualified providers come to you
          </p>
        </div>
        
        <ServiceRequestForm />
        
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            Your request will be matched with relevant providers using AI.
            You'll receive offers directly from qualified professionals.
          </p>
        </div>
      </div>
    </div>
  );
}