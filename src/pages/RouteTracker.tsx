import React, { useState, useEffect, useCallback } from 'react';
import { ApiRoute, apiService } from '@/services/apiService';
import Header from '@/components/Header';
import MapComponent from '@/components/Map';
import RoutesList from '@/components/RoutesList';

const RouteTracker: React.FC = () => {
  const [selectedRoute, setSelectedRoute] = useState<ApiRoute | null>(null);
  const [selectedRoutesForMap, setSelectedRoutesForMap] = useState<ApiRoute[]>([]);
  const [polylineData, setPolylineData] = useState<any>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      const polylineData = await apiService.getGeoJSONPolylines();
      setPolylineData(polylineData);
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
    <div className="h-screen flex">
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
        />
      </div>
    </div>
  );
};

export default RouteTracker;
