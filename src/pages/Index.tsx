import AuthGuard from '@/components/AuthGaurd.tsx';
import RouteTracker from './RouteTracker.tsx';

const Index = () => {
  return (
    <AuthGuard>
      <RouteTracker />
    </AuthGuard>
  );
};

export default Index;