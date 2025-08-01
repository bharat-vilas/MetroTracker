import React, { useState, useEffect } from 'react';
import { ApiRoute, apiService } from '@/services/apiService';
import Header from '@/components/Header';
import MapComponent from '@/components/Map';
import RouteSidebar from '@/components/RouteSidebar';
import RoutesList from '@/components/RoutesList';

const RouteTracker: React.FC = () => {
  const [routes, setRoutes] = useState<ApiRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<ApiRoute | null>(null);
  const [selectedRoutesForMap, setSelectedRoutesForMap] = useState<ApiRoute[]>([]);
  const [polylineData, setPolylineData] = useState<any>(null);

  useEffect(() => {
    const fetchRoutes = async () => {
      const routeData = await apiService.getRoutes();
      if (routeData && routeData.routes) {
        setRoutes(routeData.routes);
      }
    };

    const fetchPolylines = async () => {
      const polylineData = await apiService.getGeoJSONPolylines();
      setPolylineData(polylineData);
    };
    
    fetchRoutes();
    fetchPolylines();
  }, []);

  const handleRouteSelect = (route: ApiRoute) => {
    setSelectedRoute(route);
    if (!selectedRoutesForMap.includes(route)) {
      setSelectedRoutesForMap([...selectedRoutesForMap, route]);
    }
  };
  
  const handleRoutesForMap = (routes: ApiRoute[]) => {
    setSelectedRoutesForMap(routes);
  };

  return (
    <div className="flex h-full">
      <RouteSidebar 
        routes={routes} 
        selectedRoute={selectedRoute} 
        onRouteSelect={handleRouteSelect}
        onReplay={() => {}}
        isReplaying={false}
      />
      <div className="flex-1 relative">
        <Header />
        <RoutesList 
          onRouteSelect={handleRouteSelect}
          selectedRoute={selectedRoute}
          onRoutesForMap={handleRoutesForMap}
        />
        <MapComponent 
          selectedRoutesForMap={selectedRoutesForMap} 
          polylineData={polylineData}
        />
      </div>
    </div>
  );
};

export default RouteTracker;
