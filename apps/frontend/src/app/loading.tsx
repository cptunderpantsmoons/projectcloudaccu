import { LoadingSpinner } from '@/components/ui/loading';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-muted-foreground">Loading ACCU Platform...</p>
      </div>
    </div>
  );
}