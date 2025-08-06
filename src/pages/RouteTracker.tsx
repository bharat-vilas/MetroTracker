import React, { useState, useEffect, useCallback } from "react";
import { ApiRoute, apiService, Vehicle } from "@/services/apiService";
import Header from "@/components/Header";
import MapComponent from "@/components/Map";
import RoutesList from "@/components/RoutesList";
import { RefreshCw } from "lucide-react";

const RouteTracker: React.FC = () => {
  const [selectedRoute, setSelectedRoute] = useState<ApiRoute | null>(null);
  const [selectedRoutesForMap, setSelectedRoutesForMap] = useState<ApiRoute[]>(
    []
  );
  const [polylineData, setPolylineData] = useState<any>(null);
  const [isLoadingPolylines, setIsLoadingPolylines] = useState<boolean>(true);
  const [zoomToStop, setZoomToStop] = useState<{
    latitude: number;
    longitude: number;
    name: string;
    stopNumber?: number;
    eta?: string;
  } | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoadingPolylines(true);
      try {
        console.log("Fetching initial polyline data...");
        const polylineData = await apiService.getGeoJSONPolylines();
        setPolylineData(polylineData);
        console.log("Polyline data loaded successfully");
      } catch (error) {
        console.error("Failed to load initial polyline data:", error);
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

  const handleStopClick = useCallback(
    (stop: {
      latitude: number;
      longitude: number;
      name: string;
      stopNumber?: number;
      eta?: string;
    }) => {
      setZoomToStop(stop);
      // Keep the popup open - no auto-clear timeout
    },
    []
  );

  const handleVehiclesUpdate = useCallback((vehicles: Vehicle[]) => {
    setVehicles(vehicles);
  }, []);

  return (
    <div className="h-screen flex flex-col">
      {/* Header above everything */}
      <Header />

      {/* Main content area */}
      <div className=" flex " style={{ height: "100vh" }}>
        <div className="w-70 z-10">
          <RoutesList
            onRouteSelect={handleRouteSelect}
            selectedRoutesForMap={selectedRoutesForMap}
            setSelectedRoutesForMap={setSelectedRoutesForMap}
            selectedRoute={selectedRoute}
            onRoutesForMap={handleRoutesForMap}
            onStopClick={handleStopClick}
            vehicles={vehicles}
          />
        </div>
        <div className="flex-1">
          <MapComponent
            selectedRoutesForMap={selectedRoutesForMap}
            polylineData={polylineData}
            isLoadingPolylines={isLoadingPolylines}
            zoomToStop={zoomToStop}
            onVehiclesUpdate={handleVehiclesUpdate}
          />
        </div>
      </div>
    </div>
  );
};

export default RouteTracker;
