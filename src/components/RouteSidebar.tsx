import React, { useState } from 'react';
import { Route, Stop } from '@/data/routeData.ts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Play, List, CheckCircle, XCircle } from 'lucide-react';

interface RouteSidebarProps {
  routes: Route[];
  selectedRoute: Route | null;
  onRouteSelect: (route: Route) => void;
  onReplay: () => void;
  isReplaying: boolean;
}

const RouteSidebar: React.FC<RouteSidebarProps> = ({
  routes,
  selectedRoute,
  onRouteSelect,
  onReplay,
  isReplaying
}) => {
  const [stopsDialogOpen, setStopsDialogOpen] = useState(false);
  const [selectedRouteForStops, setSelectedRouteForStops] = useState<Route | null>(null);

  const getStatusIcon = (status: string) => {
    if (status === 'active') {
      return <CheckCircle className="w-4 h-4 text-success" />;
    }
    return <XCircle className="w-4 h-4 text-destructive" />;
  };

  const handleShowStops = (route: Route, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRouteForStops(route);
    setStopsDialogOpen(true);
  };

  return (
    <div className="w-80 h-full bg-sidebar-bg backdrop-blur-sm border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Routes</h2>
        <p className="text-xs text-muted-foreground mt-1">
          {routes.length} routes available
        </p>
      </div>

      {/* Routes List */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-2 gap-2">
          {routes.map((route) => (
            <div
              key={route.id}
              className={`p-3 cursor-pointer transition-all duration-200 hover:shadow-sm rounded-md border ${
                selectedRoute?.id === route.id 
                  ? 'ring-1 ring-primary bg-accent/20 border-primary/30' 
                  : 'hover:bg-accent/10 border-transparent'
              }`}
              onClick={() => onRouteSelect(route)}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-xs text-foreground truncate flex-1">
                  {route.name}
                </h3>
                <div className="flex items-center gap-1">
                  {getStatusIcon(route.status)}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0"
                    onClick={(e) => handleShowStops(route, e)}
                  >
                    <List className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                {route.startTime} - {route.endTime}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Replay Button */}
      {selectedRoute && (
        <div className="p-3 border-t border-border">
          <Button
            onClick={onReplay}
            disabled={isReplaying}
            className="w-full"
            variant="default"
            size="sm"
          >
            <Play className="w-4 h-4 mr-2" />
            {isReplaying ? 'Replaying...' : 'Replay Path'}
          </Button>
        </div>
      )}

      {/* Stops Dialog */}
      <Dialog open={stopsDialogOpen} onOpenChange={setStopsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <List className="w-5 h-5" />
              {selectedRouteForStops?.name} - Stops
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {selectedRouteForStops?.stops.map((stop, index) => (
              <div key={stop.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{stop.name}</h4>
                  {stop.estimatedArrival && (
                    <p className="text-xs text-muted-foreground">
                      ETA: {stop.estimatedArrival}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RouteSidebar;