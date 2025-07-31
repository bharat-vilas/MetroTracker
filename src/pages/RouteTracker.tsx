import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Map from '@/components/Map';
import RoutesList from '@/components/RoutesList';
import { useToast } from '@/hooks/use-toast.ts';
import { ApiRoute, apiService } from '@/services/apiService.tsx';
import { PolylineResponse } from '@/lib/polylineUtils';

const RouteTracker: React.FC = () => {
  console.log('RouteTracker rendering');
  const [selectedRoute, setSelectedRoute] = useState<ApiRoute | null>(null);
  const [selectedRoutesForMap, setSelectedRoutesForMap] = useState<ApiRoute[]>([]);
  const [polylineData, setPolylineData] = useState<PolylineResponse | null>(null);
  const [polylineLoading, setPolylineLoading] = useState<boolean>(false);
  const { toast } = useToast();

  // Fetch polyline data once on component mount
  const fetchPolylineData = async () => {
    if (polylineLoading || polylineData) return; // Prevent duplicate calls
    
    setPolylineLoading(true);
    console.log('RouteTracker: Fetching polyline data...');
    
    try {
      const data = await apiService.getGeoJSONPolylines();
      if (data && data.result) {
        setPolylineData(data);
        console.log('RouteTracker: Polyline data fetched successfully', data.result.length, 'routes');
      } else {
        console.warn('RouteTracker: No polyline data received');
      }
    } catch (error) {
      console.error('RouteTracker: Failed to fetch polyline data:', error);
      toast({
        title: "Error",
        description: "Failed to load route paths. Map functionality may be limited.",
        variant: "destructive"
      });
    } finally {
      setPolylineLoading(false);
    }
  };

  useEffect(() => {
    fetchPolylineData();
  }, []);

  const handleRouteSelect = (route: ApiRoute) => {
    setSelectedRoute(route);
    toast({
      title: "Route Selected",
      description: `Showing vehicles for ${route.name}`,
    });
  };

  const handleVehicleSelect = (vehicleId: string) => {
    toast({
      title: "Vehicle Selected",
      description: `Vehicle ${vehicleId} details`,
    });
  };

  const handleRoutesForMapSelect = (routes: ApiRoute[]) => {
    setSelectedRoutesForMap(routes);
    if (routes.length > 0) {
      toast({
        title: "Routes on Map",
        description: `Showing ${routes.length} route${routes.length > 1 ? 's' : ''} on map`,
      });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header />
      <div className="flex flex-1">
        <RoutesList
          onRouteSelect={handleRouteSelect}
          selectedRoute={selectedRoute}
          onRoutesForMap={handleRoutesForMapSelect}
        />
        <Map
          selectedRoute={selectedRoute}
          onVehicleSelect={handleVehicleSelect}
          selectedRoutesForMap={selectedRoutesForMap}
          polylineData={polylineData}
        />
      </div>
    </div>
  );
};

export default RouteTracker;