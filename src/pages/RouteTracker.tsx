import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Map from '@/components/Map';
import RoutesList from '@/components/RoutesList';
import { useToast } from '@/hooks/use-toast.ts';
import { ApiRoute } from '@/services/apiService.tsx';

const RouteTracker: React.FC = () => {
  console.log('RouteTracker rendering');
  const [selectedRoute, setSelectedRoute] = useState<ApiRoute | null>(null);
  const [selectedRoutesForMap, setSelectedRoutesForMap] = useState<ApiRoute[]>([]);
  const { toast } = useToast();
  const [polylineData, setPolylineData] = useState<ApiRoute | null>(null);
//   useEffect(()=>{
//     fetchPolylineData();
//   },[])

//   const fetchPolylineData = async () => {
//     const data = await getPolylineData();
//     if (data) {
//       setPolylineData(data); // Set it into state
//     }
//   };

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
        />
      </div>
    </div>
  );
};

export default RouteTracker;