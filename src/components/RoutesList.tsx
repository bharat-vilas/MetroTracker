import React, { useState, useEffect, useCallback, useMemo } from "react";
import { apiService, ApiRoute, RouteStop } from "@/services/apiService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  MapPin,
  Clock,
  Filter,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RoutesListProps {
  onRouteSelect: (route: ApiRoute) => void;
  selectedRoute: ApiRoute | null;
  onRoutesForMap?: (selectedRoutes: ApiRoute[]) => void;
  selectedRoutesForMap: ApiRoute[];
  setSelectedRoutesForMap: React.Dispatch<React.SetStateAction<ApiRoute[]>>;
}

const RoutesList: React.FC<RoutesListProps> = ({
  onRouteSelect,
  selectedRoute,
  onRoutesForMap,
  selectedRoutesForMap,
  setSelectedRoutesForMap,
}) => {
  const [routes, setRoutes] = useState<ApiRoute[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [filteredStops, setFilteredStops] = useState<RouteStop[]>([]);
  const [loadingStops, setLoadingStops] = useState<boolean>(false);
  const [selectedRouteForModal, setSelectedRouteForModal] =
    useState<ApiRoute | null>(null);
  const [stopFilter, setStopFilter] = useState<string>("all");
  const [selectAll, setSelectAll] = useState<boolean>(false);
  const { toast } = useToast();

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const routesData = await apiService.getRoutes();
      if (routesData?.routes && routesData.routes.length > 0) {
        setRoutes(routesData.routes);
        toast({
          title: "Routes Loaded",
          description: `Found ${routesData.routes.length} routes`,
        });
      } else {
        // No data available
        setRoutes([]);
        toast({
          title: "No Routes Available",
          description: "No route data is available at this time",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Failed to fetch routes:", error);
      setRoutes([]);
      toast({
        title: "Error",
        description: "Failed to load routes. Please check your connection.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  const getStatusIcon = (status: string) => {
    if (status === "active") {
      return <CheckCircle className="w-3 h-3 text-success" />;
    }
    return <XCircle className="w-3 h-3 text-destructive" />;
  };

  const handleRefresh = () => {
    fetchRoutes();
  };

  const fetchStops = useCallback(async (route: ApiRoute) => {
  console.log(`Fetching stops for route: ${route.name} (ID: ${route.id})`);

  setSelectedRouteForModal(route);
  setStopFilter('all');
  setLoadingStops(true);
  setStops([]);
  setFilteredStops([]);
    console.log("route name",route)
  try {
    const stopsData = await apiService.getStopsForRoute(route.name);

    if (stopsData?.stops && Array.isArray(stopsData.stops)) {
      const cleanStops = stopsData.stops.map(stop => ({
        ...stop,
        name: stop.name?.trim() || 'Unknown Stop',
      }));

      console.log(`Fetched ${cleanStops.length} stops for route: ${route.name}`);

      setStops(cleanStops);
      setFilteredStops(cleanStops);

      toast({
        title: "Stops Loaded",
        description: `Found ${cleanStops.length} stops for ${route.name}`,
      });
    } else {
      console.log(`No stops found for route: ${route.name}`);
      setStops([]);
      setFilteredStops([]);

      toast({
        title: "No Stops Available",
        description: `No stop data available for ${route.name}`,
      });
    }
  } catch (error) {
    console.error(`Failed to fetch stops for route ${route.name}:`, error);

    setStops([]);
    setFilteredStops([]);

    toast({
      title: "Error Loading Stops",
      description: `Failed to load stops for ${route.name}. Please try again later.`,
      variant: "destructive",
    });
  } finally {
    setLoadingStops(false);
  }
}, [toast]);

  const handleFilterChange = (value: string) => {
    console.log("Selected stop filter value:", value);
    console.log(
      "Available unique stop names:",
      Array.from(new Set(stops.map((s) => s.name)))
    );
    setStopFilter(value);

    if (value === "all") {
      setFilteredStops(stops);
    } else {
      // Filter by stop name
      const filtered = stops.filter((stop) => stop.name === value);
      console.log("Filtered stops count:", filtered.length);
      setFilteredStops(filtered);
    }
  };

  const handleSelectAllChange = (checked: boolean) => {
  setSelectAll(checked);
  if (checked) {
    setSelectedRoutesForMap(routes); // routes is of type ApiRoute[]
    onRoutesForMap?.(routes);
  } else {
    setSelectedRoutesForMap([]);
    onRoutesForMap?.([]);
  }
}

  const handleRouteCheckboxChange = (routeId: string, checked: boolean) => {
    let newSelectedRoutes: ApiRoute[];

    if (checked) {
      const selectedRoute = routes.find(route => route.id === routeId);
      if (!selectedRoute) return;

      newSelectedRoutes = [...selectedRoutesForMap, selectedRoute];
    } else {
      newSelectedRoutes = selectedRoutesForMap.filter((r) => r.id !== routeId);
      setSelectAll(false);
    }

    setSelectedRoutesForMap(newSelectedRoutes);
    onRoutesForMap?.(newSelectedRoutes);

    if (newSelectedRoutes.length === routes.length) {
      setSelectAll(true);
    }
}

  return (
    <div className="w-35vw h-full bg-sidebar-bg backdrop-blur-sm border-r border-border flex flex-col max-h-screen" style={{height: "88vh"}}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Routes</h2>
            <p className="text-xs text-muted-foreground mt-1">
              {routes.length} routes available
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Select All Checkbox */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all"
              checked={selectAll}
              onCheckedChange={handleSelectAllChange}
            />
            <label
              htmlFor="select-all"
              className="text-sm text-foreground cursor-pointer"
            >
              Mark all
            </label>
          </div>
          {selectedRoutesForMap.length > 0 && (
            <div className="text-xs text-primary font-medium px-2 py-1 bg-primary/10 rounded">
              {selectedRoutesForMap.length} on map
            </div>
          )}
        </div>
      </div>

      {/* Routes List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">
                Loading routes...
              </span>
            </div>
          ) : routes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MapPin className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No Routes Available
              </h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-xs">
                No route data is currently available. Please check your
                connection and try again.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {routes.map((route) => (
                <div
                  key={route.id}
                  className={`p-2 rounded-md border transition-all duration-200 ${
                    selectedRoute?.id === route.id
                      ? "ring-1 ring-primary bg-accent/20 border-primary/30"
                      : "hover:bg-accent/10 border-transparent hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <Checkbox
                        checked={selectedRoutesForMap.some(r => r.id === route.id)}
                        onCheckedChange={(checked) =>
                          handleRouteCheckboxChange(
                            route.id,
                            checked as boolean
                          )
                        }
                      />
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium truncate">
                            {route.name}
                          </span>
                          {selectedRoutesForMap.some(r => r.id === route.id) && (
                            <div
                              className="w-2 h-2 bg-primary rounded-full animate-pulse"
                              title="Displayed on map"
                            />
                          )}
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          {getStatusIcon(route.status)}
                          <span>{route.status}</span>
                          <span>•</span>
                          <span>
                            {route.startTime || "06:00"}-
                            {route.endTime || "22:00"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => fetchStops(route)}
                          className="h-7 px-2 text-xs"
                        >
                          View Stops
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-[60vw] max-h-[90vh] z-[9999]">
                        <DialogHeader>
                          <DialogTitle className="flex items-center space-x-2">
                            <MapPin className="h-5 w-5" />
                            <span>{selectedRouteForModal?.name} Stops</span>
                          </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4">
                          <div className="mb-4">
                            <div className="flex items-center space-x-2 mb-3">
                              <Filter className="h-4 w-4" />
                              <span className="text-sm font-medium">
                                Filter by Stop:
                              </span>
                            </div>
                            <Select
                              key={`${selectedRouteForModal?.id}-${stops.length}`}
                              value={stopFilter}
                              onValueChange={handleFilterChange}
                            >
                              <SelectTrigger className="w-full z-[10001]">
                                <SelectValue placeholder="Select stop to view" />
                              </SelectTrigger>
                              <SelectContent className="z-[10002] bg-popover border shadow-lg max-h-[200px] overflow-auto">
                                <SelectItem value="all">All Stops</SelectItem>
                                {Array.from(
                                  new Set(stops.map((stop) => stop.name))
                                ).map((stopName, index) => (
                                  <SelectItem
                                    key={`${stopName}-${index}`}
                                    value={stopName}
                                  >
                                    {stopName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <ScrollArea className="h-[300px] pr-4 overflow-y-auto">
                            <div className="space-y-1">
                              {/* Header row */}
                              <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg font-medium text-sm">
                                <div>Stop Name</div>
                                <div>ETA</div>
                              </div>

                              {loadingStops ? (
                                <div className="flex items-center justify-center py-8">
                                  <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                                  <span className="ml-2 text-muted-foreground">
                                    Loading stops...
                                  </span>
                                </div>
                              ) : filteredStops.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                  <MapPin className="w-8 h-8 text-muted-foreground mb-3" />
                                  <h4 className="text-md font-medium text-foreground mb-2">
                                    No Stops Available
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    No stop data is available for this route.
                                  </p>
                                </div>
                              ) : (
                                filteredStops.map((stop, index) => (
                                  <div key={index} className="relative">
                                    {/* Connecting line to next stop - only show when viewing all stops */}
                                    {stopFilter === "all" &&
                                      index < filteredStops.length - 1 && (
                                        <div className="absolute left-[17px] top-[35px] w-0.5 h-[20px] bg-green-500 z-0" />
                                      )}

                                    <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg relative items-center">
                                      <div className="flex items-center space-x-3">
                                        {/* Green dot for stop */}
                                        <div className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0 relative z-10" />
                                        <span className="font-medium text-sm">
                                          {stop.name}
                                        </span>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <Clock className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-sm font-mono bg-primary/10 px-2 py-1 rounded">
                                          {stop.eta || "N/A"}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </ScrollArea>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default RoutesList;
