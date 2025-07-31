import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ApiRoute, VehicleAvlData, RouteStop, apiService } from '@/services/apiService';
import { 
  processPolylineData, 
  processGeoJSONPolyline, 
  processMultiplePolylines,
  PolylineResponse,
  PolylineData 
} from '@/lib/polylineUtils';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapProps {
  selectedRoute: ApiRoute | null;
  onVehicleSelect: (vehicleId: string) => void;
  selectedRoutesForMap?: ApiRoute[];
  polylineData?: PolylineResponse; // New prop for polyline data
}

const MapComponent: React.FC<MapProps> = ({ 
  selectedRoute, 
  onVehicleSelect, 
  selectedRoutesForMap = [],
  polylineData 
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const routeLinesRef = useRef<L.Polyline[]>([]);
  const vehicleMarkersRef = useRef(new Map<string, L.Marker>());
  const [vehicles, setVehicles] = useState<VehicleAvlData[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Route colors for different routes (fallback)
  const routeColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
  ];

  console.log('Map component rendering', { 
    selectedRoute: selectedRoute?.name, 
    selectedRoutesForMap: selectedRoutesForMap?.map(r => r.name),
    polylineData: polylineData?.result?.length 
  });

  // Custom vehicle icon creator
  const createVehicleIcon = (vehicleId: string, speed: number = 0) => {
    const color = '#ff6b35'; // Orange/red for active vehicles (more distinctive)
    const isMoving = speed > 0;
    
    return L.divIcon({
      html: `<div style="
        width: 20px; 
        height: 20px; 
        background: linear-gradient(45deg, ${color}, #ff8c42); 
        border: 3px solid white; 
        border-radius: 50%; 
        box-shadow: 0 3px 6px rgba(0,0,0,0.4);
        position: relative;
        ${isMoving ? 'animation: vehiclePulse 1.5s infinite;' : ''}
      ">
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          font-size: 8px;
          font-weight: bold;
          text-shadow: 1px 1px 1px rgba(0,0,0,0.5);
        ">🚌</div>
      </div>
      <style>
        @keyframes vehiclePulse {
          0% { transform: scale(1); box-shadow: 0 3px 6px rgba(0,0,0,0.4); }
          50% { transform: scale(1.15); box-shadow: 0 4px 8px rgba(255,107,53,0.6); }
          100% { transform: scale(1); box-shadow: 0 3px 6px rgba(0,0,0,0.4); }
        }
      </style>`,
      className: `vehicle-marker vehicle-${vehicleId}`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  };

  // Clear specific route elements (updated to be more selective)
  const clearRouteElements = useCallback((clearPolylines = true, clearStops = true) => {
    console.log('Clearing route elements', { clearPolylines, clearStops });
    
    // Clear route polylines only if requested
    if (clearPolylines) {
      routeLinesRef.current.forEach(line => {
        if (mapRef.current) {
          mapRef.current.removeLayer(line);
        }
      });
      routeLinesRef.current = [];
    }

    // Clear stop markers only if requested
    if (clearStops) {
      markersRef.current.forEach(marker => {
        if (mapRef.current) {
          mapRef.current.removeLayer(marker);
        }
      });
      markersRef.current = [];
    }
  }, []);

  // Clear all map elements (for complete cleanup)
  const clearMapElements = useCallback(() => {
    console.log('Clearing all map elements');
    clearRouteElements(true, true);
  }, [clearRouteElements]);

  // Clear vehicle markers
  const clearVehicleMarkers = useCallback(() => {
    vehicleMarkersRef.current.forEach(marker => {
      if (mapRef.current) {
        mapRef.current.removeLayer(marker);
      }
    });
    vehicleMarkersRef.current.clear();
  }, []);

  // Update vehicle markers with smooth transitions
  const updateVehicleMarkers = useCallback((vehicles: VehicleAvlData[]) => {
    if (!mapRef.current) return;

    vehicles.forEach(vehicle => {
      const existingMarker = vehicleMarkersRef.current.get(vehicle.vehicle_id);
      
      if (existingMarker) {
        // Smooth transition to new position
        const currentLatLng = existingMarker.getLatLng();
        const newLatLng = L.latLng(vehicle.latitude, vehicle.longitude);
        
        // Animate the marker to the new position
        let start = Date.now();
        const duration = 2000; // 2 seconds for smooth transition
        
        const animate = () => {
          const elapsed = Date.now() - start;
          const progress = Math.min(elapsed / duration, 1);
          
          // Easing function for smooth animation
          const easeProgress = 1 - Math.pow(1 - progress, 3);
          
          const lat = currentLatLng.lat + (newLatLng.lat - currentLatLng.lat) * easeProgress;
          const lng = currentLatLng.lng + (newLatLng.lng - currentLatLng.lng) * easeProgress;
          
          existingMarker.setLatLng([lat, lng]);
          
          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        };
        
        animate();
      } else {
        // Create new marker
        const marker = L.marker([vehicle.latitude, vehicle.longitude], {
          icon: createVehicleIcon(vehicle.vehicle_id, vehicle.speed || 0)
        })
        .bindPopup(`
          <div class="p-2">
            <h3 class="font-bold">${vehicle.vehicle_id}</h3>
            <p class="text-sm">Speed: ${vehicle.speed || 'N/A'} km/h</p>
            <p class="text-sm">Heading: ${vehicle.heading || 'N/A'}°</p>
            <p class="text-xs text-gray-500">Updated: ${new Date(vehicle.timestamp).toLocaleTimeString()}</p>
          </div>
        `)
        .addTo(mapRef.current);

        marker.on('click', () => {
          onVehicleSelect(vehicle.vehicle_id);
        });

        vehicleMarkersRef.current.set(vehicle.vehicle_id, marker);
      }
    });

    // Remove markers for vehicles no longer present
    const currentVehicleIds = new Set(vehicles.map(v => v.vehicle_id));
    vehicleMarkersRef.current.forEach((marker, vehicleId) => {
      if (!currentVehicleIds.has(vehicleId)) {
        mapRef.current?.removeLayer(marker);
        vehicleMarkersRef.current.delete(vehicleId);
      }
    });
  }, [onVehicleSelect]);

  // Create stop marker with color
  const createStopMarker = useCallback((color: string, stopIndex?: number) => {
    const isFirstOrLast = stopIndex === 0 || stopIndex === -1;
    const size = isFirstOrLast ? 16 : 12;
    const borderWidth = isFirstOrLast ? 3 : 2;
    
    return L.divIcon({
      html: `<div style="
        width: ${size}px; 
        height: ${size}px; 
        background-color: ${color}; 
        border: ${borderWidth}px solid white; 
        border-radius: 50%; 
        box-shadow: 0 2px 4px rgba(0,0,0,0.4);
        ${isFirstOrLast ? 'border-color: #333;' : ''}
        ${isFirstOrLast ? 'animation: stopPulse 2s infinite;' : ''}
      "></div>
      <style>
        @keyframes stopPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      </style>`,
      className: `stop-marker ${isFirstOrLast ? 'terminal-stop' : 'regular-stop'}`,
      iconSize: [size + borderWidth * 2, size + borderWidth * 2],
      iconAnchor: [(size + borderWidth * 2) / 2, (size + borderWidth * 2) / 2]
    });
  }, []);

  // Draw polylines from GeoJSON-like data structure
  const drawPolylinesFromGeoJSON = useCallback(async (polylineResponse: PolylineResponse, filterRoutes?: ApiRoute[]) => {
    if (!mapRef.current || !polylineResponse?.result) {
      console.warn('Map not ready or no polyline data');
      return;
    }

    console.log('Drawing polylines from GeoJSON data:', polylineResponse.result.length);

    // Only clear existing polylines and stops if we're showing different routes
    clearRouteElements(true, true);

    const processedPolylines = processMultiplePolylines(polylineResponse);
    const allBounds: L.LatLngBounds[] = [];

    // Fetch all stops for the routes we're about to draw
    const routeStopsMap = new Map<string, RouteStop[]>();

    // First, fetch stops for all routes that we're going to display
    const routesToFetchStops = [];
    if (filterRoutes && filterRoutes.length > 0) {
      routesToFetchStops.push(...filterRoutes);
    } else {
      // Create route objects from polyline data for stop fetching
      processedPolylines.forEach((polylineInfo) => {
        routesToFetchStops.push({
          id: polylineInfo.segmentId,
          name: polylineInfo.name,
          segment_id: polylineInfo.segmentId,
          status: 'active',
          startTime: '06:00',
          endTime: '22:00'
        } as ApiRoute);
      });
    }

    // Fetch stops for all routes in parallel
    try {
      const stopPromises = routesToFetchStops.map(async (route) => {
        try {
          const stopsData = await apiService.getStopsForRoute(route.name);
          if (stopsData?.stops) {
            routeStopsMap.set(route.segment_id || route.id, stopsData.stops);
          }
        } catch (error) {
          console.warn(`Failed to fetch stops for route ${route.name}:`, error);
        }
      });
      
      await Promise.all(stopPromises);
      console.log('Fetched stops for routes:', Array.from(routeStopsMap.keys()));
    } catch (error) {
      console.warn('Error fetching route stops:', error);
    }

    processedPolylines.forEach((polylineInfo, index) => {
      // If filtering by routes, check if this polyline matches any selected route
      if (filterRoutes && filterRoutes.length > 0) {
        const matchingRoute = filterRoutes.find(route => 
          route.segment_id === polylineInfo.segmentId || 
          route.id === polylineInfo.segmentId ||
          route.name === polylineInfo.name
        );
        
        if (!matchingRoute) {
          console.log(`Skipping polyline ${polylineInfo.name} - not in selected routes`);
          return;
        }
      }

      if (polylineInfo.coordinates.length > 0) {
        console.log(`Drawing polyline for ${polylineInfo.name} with ${polylineInfo.coordinates.length} points`);
        
        // Create polyline with style from data
        const routeLine = L.polyline(
          polylineInfo.coordinates,
          {
            color: polylineInfo.style.color,
            weight: polylineInfo.style.weight,
            opacity: polylineInfo.style.opacity
          }
        ).bindPopup(`
          <div class="p-2">
            <h3 class="font-bold text-sm">${polylineInfo.name}</h3>
            <p class="text-xs text-gray-600">Segment ID: ${polylineInfo.segmentId}</p>
            <p class="text-xs text-gray-600">${polylineInfo.coordinates.length} points</p>
            <div class="flex items-center mt-1">
              <div style="
                width: 12px; 
                height: 12px; 
                background-color: ${polylineInfo.style.color}; 
                border-radius: 2px; 
                margin-right: 4px;
              "></div>
              <span class="text-xs">Color: ${polylineInfo.style.color}</span>
            </div>
          </div>
        `).addTo(mapRef.current);

        routeLinesRef.current.push(routeLine);
        allBounds.push(routeLine.getBounds());

        // Add stop markers for this route
        const routeStops = routeStopsMap.get(polylineInfo.segmentId);
        if (routeStops && routeStops.length > 0) {
          console.log(`Adding ${routeStops.length} stop markers for route ${polylineInfo.name}`);
          
          routeStops.forEach((stop, stopIndex) => {
            // Mark first and last stops differently
            const adjustedIndex = stopIndex === routeStops.length - 1 ? -1 : stopIndex;
            const stopIcon = createStopMarker(polylineInfo.style.color, adjustedIndex);
            const marker = L.marker([stop.latitude, stop.longitude], { icon: stopIcon })
              .bindPopup(`
                <div class="p-2">
                  <h3 class="font-bold text-sm">${stop.name}</h3>
                  <p class="text-xs text-gray-600">Route: ${polylineInfo.name}</p>
                  <p class="text-xs">Stop ${stopIndex + 1} of ${routeStops.length}</p>
                  ${stop.eta ? `<p class="text-xs font-medium text-primary">ETA: ${stop.eta}</p>` : ''}
                  <div class="flex items-center mt-1">
                    <div style="
                      width: 8px; 
                      height: 8px; 
                      background-color: ${polylineInfo.style.color}; 
                      border-radius: 50%; 
                      margin-right: 4px;
                    "></div>
                    <span class="text-xs">Route Color</span>
                  </div>
                </div>
              `)
              .addTo(mapRef.current);

            markersRef.current.push(marker);
          });
        }
      } else {
        console.warn(`No valid coordinates for polyline: ${polylineInfo.name}`);
      }
    });

    // Fit map to show all polylines
    if (allBounds.length > 0) {
      const group = new L.FeatureGroup();
      allBounds.forEach(bounds => {
        group.addLayer(L.rectangle(bounds, { stroke: false, fill: false }));
      });
      
      mapRef.current.fitBounds(group.getBounds(), {
        padding: [20, 20],
        maxZoom: 15
      });
    }
  }, [clearRouteElements, createStopMarker]);

  // Legacy method - Draw route paths on map using polyline API (kept for backward compatibility)
  const drawRoutePaths = useCallback(async (routes: ApiRoute[]) => {
    if (!mapRef.current || !routes.length) return;

    console.log('Drawing route paths for routes:', routes.map(r => r.name));

    // Only clear if we're showing different routes
    clearRouteElements(true, true);

    try {
       // Use the new GeoJSON polyline API method
      const polylineData = await apiService.getGeoJSONPolylines();
      
      console.log('Fetched polyline data:', polylineData);
      
      if (!polylineData?.result || polylineData.result.length === 0) {
        console.warn('No polyline data available from API');
        return;
      }

      // If we have polyline data, use the GeoJSON method
      if (polylineData.result.length > 0) {
        console.log('Using GeoJSON polyline method with API data');
        drawPolylinesFromGeoJSON(polylineData, routes);
        return;
      }

      // Fallback to legacy method if needed
      const legacyPolylineData = await apiService.getRoutePolyline();
      
      if (!legacyPolylineData?.routes) {
        console.warn('No legacy polyline data available');
        return;
      }

      const allBounds: L.LatLngBounds[] = [];

      routes.forEach((route, index) => {
        // Find matching polyline data for this route
        const routePolylineData = legacyPolylineData.routes.find(
          (polyRoute: any) => 
            polyRoute.segment_id === route.id || 
            polyRoute.route_name === route.name ||
            polyRoute.segment_id === route.segment_id
        );

        if (routePolylineData) {
          const color = routePolylineData.color || routeColors[index % routeColors.length];
          let coordinates: [number, number][] = [];

          // Process coordinates - handle both encoded polylines and coordinate arrays
          if (routePolylineData.coordinates && routePolylineData.coordinates.length > 0) {
            coordinates = processPolylineData(routePolylineData.coordinates);
          } else if (routePolylineData.polyline) {
            // Try to decode polyline string
            coordinates = processPolylineData(routePolylineData.polyline);
          }

          // Draw polyline if we have valid coordinates
          if (coordinates.length > 0) {
            console.log(`Drawing polyline for route ${route.name} with ${coordinates.length} points`);
            
            const routeLine = L.polyline(
              coordinates,
              {
                color: color,
                weight: 4,
                opacity: 0.8
              }
            ).bindPopup(`
              <div class="p-2">
                <h3 class="font-bold text-sm">${route.name}</h3>
                <p class="text-xs text-gray-600">${coordinates.length} points</p>
              </div>
            `).addTo(mapRef.current);

            routeLinesRef.current.push(routeLine);
            allBounds.push(routeLine.getBounds());
          } else {
            console.warn(`No valid coordinates found for route: ${route.name}`, routePolylineData);
          }

          // Add stop markers if available
          if (routePolylineData.stops && routePolylineData.stops.length > 0) {
            routePolylineData.stops.forEach((stop: any, stopIndex: number) => {
              const stopIcon = createStopMarker(color);
              const marker = L.marker([stop.latitude, stop.longitude], { icon: stopIcon })
                .bindPopup(`
                  <div class="p-2">
                    <h3 class="font-bold text-sm">${stop.name}</h3>
                    <p class="text-xs text-gray-600">Route: ${route.name}</p>
                    <p class="text-xs">Stop ${stopIndex + 1}</p>
                    ${stop.eta ? `<p class="text-xs font-medium">ETA: ${stop.eta}</p>` : ''}
                  </div>
                `)
                .addTo(mapRef.current);

              markersRef.current.push(marker);
            });
          }
        } else {
          console.warn(`No polyline data found for route: ${route.name}`);
        }
      });

      // Fit map to show all routes
      if (allBounds.length > 0) {
        const group = new L.FeatureGroup();
        allBounds.forEach(bounds => {
          group.addLayer(L.rectangle(bounds, { stroke: false, fill: false }));
        });
        
        mapRef.current.fitBounds(group.getBounds(), {
          padding: [20, 20],
          maxZoom: 15
        });
      }
    } catch (error) {
      console.error('Failed to fetch polyline data:', error);
    }
  }, [clearRouteElements, createStopMarker, routeColors, drawPolylinesFromGeoJSON]);

  // Fetch all vehicles
  const fetchAllVehicles = useCallback(async () => {
    try {
      const avlData = await apiService.getAvlData();
      
      if (avlData?.result) {
        const allVehicles: VehicleAvlData[] = [];
        
        avlData.result.forEach((vehicleGroup: any) => {
          if (vehicleGroup.avl_data && Array.isArray(vehicleGroup.avl_data)) {
            vehicleGroup.avl_data.forEach((vehicle: VehicleAvlData) => {
              allVehicles.push({
                ...vehicle,
                vehicle_id: vehicleGroup.vehicle_id || vehicle.vehicle_id
              });
            });
          }
        });
        
        setVehicles(allVehicles);
        updateVehicleMarkers(allVehicles);
      }
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
    }
  }, [updateVehicleMarkers]);

  // Start vehicle tracking
  const startVehicleTracking = useCallback(() => {
    console.log('Starting vehicle tracking');
    
    // Initial fetch
    fetchAllVehicles();
    
    // Set up interval for regular updates
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(() => {
      fetchAllVehicles();
    }, 3000); // Update every 3 seconds for more responsive tracking
  }, [fetchAllVehicles]);

  // Stop vehicle tracking
  const stopVehicleTracking = useCallback(() => {
    console.log('Stopping vehicle tracking');
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    clearVehicleMarkers();
  }, [clearVehicleMarkers]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    console.log('Initializing map');
    
    // Create map
    const map = L.map(mapContainer.current, {
      center: [42.3601, -71.0589], // Default to Boston coordinates
      zoom: 13,
      zoomControl: true,
      attributionControl: false
    });

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    mapRef.current = map;

    // Start vehicle tracking
    startVehicleTracking();

    // Cleanup function
    return () => {
      console.log('Cleaning up map');
      stopVehicleTracking();
      clearMapElements();
      clearVehicleMarkers();
      
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [startVehicleTracking, stopVehicleTracking, clearMapElements, clearVehicleMarkers]);

  // Handle polyline data changes (new primary method)
  useEffect(() => {
    const updatePolylines = async () => {
      if (polylineData && polylineData.result) {
        console.log('Polyline data provided, drawing from GeoJSON structure');
        await drawPolylinesFromGeoJSON(polylineData, selectedRoutesForMap.length > 0 ? selectedRoutesForMap : undefined);
      } else if (selectedRoutesForMap && selectedRoutesForMap.length > 0) {
        console.log('No polyline data provided, falling back to legacy API');
        await drawRoutePaths(selectedRoutesForMap);
      } else {
        // Only clear route elements, keep vehicles
        clearRouteElements(true, true);
      }
    };

    updatePolylines();
  }, [polylineData, selectedRoutesForMap, drawPolylinesFromGeoJSON, drawRoutePaths, clearRouteElements]);

  return (
    <div className="relative flex-1 h-full">
      <div 
        ref={mapContainer} 
        className="h-full w-full"
        style={{ height: '100%' }}
      />
    </div>
  );
};

export default MapComponent;