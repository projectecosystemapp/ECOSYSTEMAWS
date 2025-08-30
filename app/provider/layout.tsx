import ProviderNav from '@/components/provider/ProviderNav';

export default function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <ProviderNav />
      {children}
    </div>
  );
}