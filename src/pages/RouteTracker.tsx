import React, { useState, useEffect, useCallback } from 'react';
import { ApiRoute, apiService } from '@/services/apiService';
import Header from '@/components/Header';
import MapComponent from '@/components/Map';
import RoutesList from '@/components/RoutesList';
import { RefreshCw } from 'lucide-react';

const RouteTracker: React.FC = () => {
  const [selectedRoute, setSelectedRoute] = useState<ApiRoute | null>(null);
  const [selectedRoutesForMap, setSelectedRoutesForMap] = useState<ApiRoute[]>([]);
  const [polylineData, setPolylineData] = useState<any>(null);
  const [isLoadingPolylines, setIsLoadingPolylines] = useState<boolean>(true);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoadingPolylines(true);
      try {
        console.log('Fetching initial polyline data...');
        const polylineData = await apiService.getGeoJSONPolylines();
        setPolylineData(polylineData);
        console.log('Polyline data loaded successfully');
      } catch (error) {
        console.error('Failed to load initial polyline data:', error);
      } finally {
        setIsLoadingPolylines(false);
      }
    };

    fetchInitialData();
  }, []);

  const handleRouteSelect = useCallback((route: ApiRoute) => {
    setSelectedRoute(route);
  }, []);
  
  const handleRoutesForMap = useCallback((routes: ApiRoute[]) => {
    setSelectedRoutesForMap(routes);
  }, []);

  return (
    <div className="h-screen flex flex-col">
      {/* Header above everything */}
      <Header />
      
      {/* Main content area */}
      <div className="flex-1 flex">
        <div className="w-80 z-10">
          <RoutesList 
            onRouteSelect={handleRouteSelect}
            selectedRoute={selectedRoute}
            onRoutesForMap={handleRoutesForMap}
          />
        </div>
        <div className="flex-1">
        <MapComponent 
          selectedRoutesForMap={selectedRoutesForMap}
          polylineData={polylineData}
          isLoadingPolylines={isLoadingPolylines}
        />
        </div>
      </div>
    </div>
  );
};

export default RouteTracker;
