import { EnhancedSearch } from '@/components/search/enhanced-search';

export default function SearchPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Search Everything</h1>
          <p className="text-muted-foreground">
            Find services, requests, and providers with AI-powered search
          </p>
        </div>
        
        <EnhancedSearch />
      </div>
    </div>
  );
}