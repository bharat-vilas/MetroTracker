import React, { useState, useEffect } from 'react';
import { ApiRoute, apiService } from '@/services/apiService';
import Header from '@/components/Header';
import MapComponent from '@/components/Map';
import RoutesList from '@/components/RoutesList';

const RouteTracker: React.FC = () => {
  const [selectedRoute, setSelectedRoute] = useState<ApiRoute | null>(null);
  const [selectedRoutesForMap, setSelectedRoutesForMap] = useState<ApiRoute[]>([]);
  const [polylineData, setPolylineData] = useState<any>(null);

  useEffect(() => {
    const fetchPolylines = async () => {
      const polylineData = await apiService.getGeoJSONPolylines();
      setPolylineData(polylineData);
    };
    
    fetchPolylines();
  }, []);

  const handleRouteSelect = (route: ApiRoute) => {
    setSelectedRoute(route);
  };
  
  const handleRoutesForMap = (routes: ApiRoute[]) => {
    setSelectedRoutesForMap(routes);
  };

  return (
    <div className="h-screen flex flex-col">
      <Header />
      <div className="flex-1 relative">
        {/* Map as background */}
        <div className="absolute inset-0">
          <MapComponent 
            selectedRoutesForMap={selectedRoutesForMap} 
            polylineData={polylineData}
          />
        </div>
        
        {/* Routes list overlay */}
        <div className="absolute top-0 left-0 z-10">
          <RoutesList 
            onRouteSelect={handleRouteSelect}
            selectedRoute={selectedRoute}
            onRoutesForMap={handleRoutesForMap}
          />
        </div>
      </div>
    </div>
  );
};

export default RouteTracker;
