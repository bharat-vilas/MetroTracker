import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { apiService, ApiRoute, Vehicle, RouteStop } from '@/services/apiService';
import { PolylineResponse, processMultiplePolylines } from '@/lib/polylineUtils';

// Error notification component
const ErrorNotification: React.FC<{ error: string; onDismiss: () => void }> = ({ error, onDismiss }) => (
  <div className="absolute top-4 right-4 z-[1000] max-w-md bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
    <div className="flex items-start">
      <div className="flex-shrink-0">
        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      </div>
      <div className="ml-3 flex-1">
        <h3 className="text-sm font-medium text-red-800">Connection Error</h3>
        <p className="text-sm text-red-700 mt-1">{error}</p>
        <div className="mt-2">
          <button
            onClick={onDismiss}
            className="text-xs font-medium text-red-800 hover:text-red-700 underline"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  </div>
);

// Status indicator component
const StatusIndicator: React.FC<{ status: 'connected' | 'error' | 'loading' }> = ({ status }) => {
  const statusConfig = {
    connected: { color: 'bg-green-500', text: 'Connected', pulse: false },
    error: { color: 'bg-red-500', text: 'Connection Error', pulse: true },
    loading: { color: 'bg-yellow-500', text: 'Connecting...', pulse: true }
  };
  
  const config = statusConfig[status];
  
  return (
    <div className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-md p-2">
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${config.color} ${config.pulse ? 'animate-pulse' : ''}`}></div>
        <span className="text-sm font-medium text-gray-700">{config.text}</span>
      </div>
    </div>
  );
};

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapComponentProps {
  selectedRoute?: ApiRoute | null;
  onVehicleSelect?: (vehicleId: string) => void;
  selectedRoutesForMap?: ApiRoute[];
  polylineData?: PolylineResponse;
  isLoadingPolylines?: boolean;
}

const MapComponent: React.FC<MapComponentProps> = ({
  selectedRoute,
  onVehicleSelect,
  selectedRoutesForMap = [],
  polylineData,
  isLoadingPolylines = false
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routeLinesRef = useRef<L.Polyline[]>([]);
  const stopMarkersRef = useRef<L.Marker[]>([]);
  const vehicleMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Route colors for visual distinction
  const routeColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#f97316', '#06b6d4', '#84cc16'];

  // Add tracking refs for polyline state
  const polylinesDrawnRef = useRef<boolean>(false);
  const currentPolylineDataRef = useRef<PolylineResponse | null>(null); // Track current polyline data
  const currentSelectedRoutesRef = useRef<ApiRoute[]>([]); // Track current selected routes
  
  // Note: Route stops caching is now handled centrally in apiService
  
  // Add debounce and rate limiting
  const lastPolylineUpdateRef = useRef<number>(0);
  const lastVehicleUpdateRef = useRef<number>(0);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'error' | 'loading'>('loading');

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
        width: 24px; 
        height: 16px; 
        background: linear-gradient(45deg, ${color}, #ff8c42); 
        border: 2px solid white; 
        border-radius: 6px; 
        box-shadow: 0 3px 6px rgba(0,0,0,0.4);
        position: relative;
        ${isMoving ? 'animation: vehiclePulse 1.5s infinite;' : ''}
      ">
        <!-- Car body shape -->
        <div style="
          position: absolute;
          top: 2px;
          left: 2px;
          right: 2px;
          bottom: 2px;
          background: ${color};
          border-radius: 4px;
        "></div>
        <!-- Front windshield -->
        <div style="
          position: absolute;
          top: 3px;
          right: 3px;
          width: 4px;
          height: 8px;
          background: rgba(255,255,255,0.7);
          border-radius: 0 2px 2px 0;
        "></div>
        <!-- Rear windshield -->
        <div style="
          position: absolute;
          top: 3px;
          left: 3px;
          width: 4px;
          height: 8px;
          background: rgba(255,255,255,0.7);
          border-radius: 2px 0 0 2px;
        "></div>
        <!-- Car wheels -->
        <div style="
          position: absolute;
          bottom: -2px;
          left: 2px;
          width: 4px;
          height: 4px;
          background: #333;
          border-radius: 50%;
        "></div>
        <div style="
          position: absolute;
          bottom: -2px;
          right: 2px;
          width: 4px;
          height: 4px;
          background: #333;
          border-radius: 50%;
        "></div>
      </div>
      <style>
        @keyframes vehiclePulse {
          0% { transform: scale(1); box-shadow: 0 3px 6px rgba(0,0,0,0.4); }
          50% { transform: scale(1.1); box-shadow: 0 4px 8px rgba(255,107,53,0.6); }
          100% { transform: scale(1); box-shadow: 0 3px 6px rgba(0,0,0,0.4); }
        }
      </style>`,
      className: `vehicle-marker vehicle-${vehicleId}`,
      iconSize: [24, 16],
      iconAnchor: [12, 8]
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
      polylinesDrawnRef.current = false;
      currentPolylineDataRef.current = null;
    }

    // Clear stop markers only if requested
    if (clearStops) {
      stopMarkersRef.current.forEach(marker => {
        if (mapRef.current) {
          mapRef.current.removeLayer(marker);
        }
      });
      stopMarkersRef.current = [];
    }
  }, []);

  // Function to preserve polylines when only updating vehicle data
  const preservePolylines = useCallback(() => {
    console.log('Preserving polylines during vehicle update');
    // This function intentionally does nothing to preserve existing polylines
    return;
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
  const updateVehicleMarkers = useCallback((vehicles: Vehicle[]) => {
    if (!mapRef.current) return;

    vehicles.forEach(vehicle => {
      const existingMarker = vehicleMarkersRef.current.get(vehicle.vehicle_id);
      
      if (existingMarker) {
        // Smooth transition to new position
        const currentLatLng = existingMarker.getLatLng();
        const newLatLng = L.latLng(vehicle.lat || vehicle.latitude || 0, vehicle.lng || vehicle.longitude || 0);
        
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
        const marker = L.marker([vehicle.lat || vehicle.latitude || 0, vehicle.lng || vehicle.longitude || 0], {
          icon: createVehicleIcon(vehicle.vehicle_id, vehicle.speed || 0)
        })
        .bindPopup(`
          <div class="p-2">
            <h3 class="font-bold">${vehicle.vehicle_id}</h3>
            <p class="text-sm">Driver: ${vehicle.driver_id || 'N/A'}</p>
            <p class="text-sm">Route: ${vehicle.segment_id || 'N/A'}</p>
            <p class="text-sm">Speed: ${vehicle.speed || 'N/A'} km/h</p>
            <p class="text-sm">Direction: ${vehicle.angle || vehicle.direction || vehicle.heading || 'N/A'}°</p>
            <p class="text-xs text-gray-500">Updated: ${vehicle.record_time || vehicle.device_time || 'N/A'}</p>
            <p class="text-xs text-gray-500">Date: ${vehicle.record_date || 'N/A'}</p>
          </div>
        `)
        .addTo(mapRef.current);

        marker.on('click', () => {
          onVehicleSelect?.(vehicle.vehicle_id);
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
  }, [onVehicleSelect, createVehicleIcon]);

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

    // Fetch stops for routes (using apiService caching)
    const routeStopsMap = new Map<string, RouteStop[]>();

    // Determine which routes we need stops for
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

    // FIXED: Use for...of loop instead of forEach to handle async/await properly
    for (const [index, polylineInfo] of processedPolylines.entries()) {
      // If filtering by routes, check if this polyline matches any selected route
      if (filterRoutes && filterRoutes.length > 0) {
        const matchingRoute = filterRoutes.find(route => 
          route.segment_id === polylineInfo.segmentId || 
          route.id === polylineInfo.segmentId ||
          route.name === polylineInfo.name
        );
        
        if (!matchingRoute) {
          console.log(`Skipping polyline ${polylineInfo.name} - not in selected routes`);
          continue;
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

        // Add stop markers for this route (fetch on-demand if not in pre-fetch)
        let routeStops = routeStopsMap.get(polylineInfo.segmentId);
        
        if (!routeStops) {
          // Fetch stops on-demand (will use cache if available)
          try {
            console.log(`Fetching stops on-demand for route: ${polylineInfo.name}`);
            const stopsData = await apiService.getStopsForRoute(polylineInfo.name);
            if (stopsData?.stops && Array.isArray(stopsData.stops) && stopsData.stops.length > 0) {
              routeStops = stopsData.stops;
              routeStopsMap.set(polylineInfo.segmentId, routeStops);
            }
          } catch (error) {
            console.warn(`Failed to fetch stops on-demand for route ${polylineInfo.name}:`, error);
          }
        }
        
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

            stopMarkersRef.current.push(marker);
          });
        }
      } else {
        console.warn(`No valid coordinates for polyline: ${polylineInfo.name}`);
      }
    }

    // Only fit bounds on initial load or when specifically requested
    // Don't auto-fit when user is just selecting/deselecting routes
    if (allBounds.length > 0 && !polylinesDrawnRef.current) {
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

  // Legacy method - Draw route paths on map using polyline API (only called when no polylineData prop is available)
  const drawRoutePaths = useCallback(async (routes: ApiRoute[]) => {
    if (!mapRef.current || !routes.length) return;

    console.log('Drawing route paths for routes (fallback API method):', routes.map(r => r.name));
    console.warn('WARNING: Making API calls from Map component. Consider providing polylineData prop to avoid this.');

    // Only clear if we're showing different routes
    clearRouteElements(true, true);

    try {
       // Use the new GeoJSON polyline API method
      const apiPolylineData = await apiService.getGeoJSONPolylines();
      
      console.log('Fetched polyline data via fallback API call:', apiPolylineData);
      
      if (!apiPolylineData?.result || apiPolylineData.result.length === 0) {
        console.warn('No polyline data available from API');
        return;
      }

      // If we have polyline data, use the GeoJSON method
      if (apiPolylineData.result.length > 0) {
        console.log('Using GeoJSON polyline method with fallback API data');
        drawPolylinesFromGeoJSON(apiPolylineData, routes);
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
            coordinates = processMultiplePolylines(routePolylineData).flatMap(p => p.coordinates);
          } else if (routePolylineData.polyline) {
            // Try to decode polyline string
            coordinates = processMultiplePolylines(routePolylineData).flatMap(p => p.coordinates);
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

              stopMarkersRef.current.push(marker);
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

  // Fetch all vehicles - independent of polyline management with rate limiting
  const fetchAllVehicles = useCallback(async () => {
    // Rate limiting: only allow vehicle updates every 4 seconds minimum
    const now = Date.now();
    if (now - lastVehicleUpdateRef.current < 4000) {
      console.log('Rate limiting: Skipping vehicle update (too frequent)');
      return;
    }
    lastVehicleUpdateRef.current = now;
    
    try {
      setConnectionStatus('loading');
      console.log('Fetching vehicle data (preserving polylines)');
      const avlData = await apiService.getAvlData();
      
      if (avlData?.result && Array.isArray(avlData.result) && avlData.result.length > 0) {
        const allVehicles: Vehicle[] = [];
        
        avlData.result.forEach((vehicleGroup: any) => {
          if (vehicleGroup.avl_data && Array.isArray(vehicleGroup.avl_data)) {
            vehicleGroup.avl_data.forEach((vehicle: any) => {
              // Handle the actual API structure
              const processedVehicle: Vehicle = {
                id: vehicle.id || 0,
                adid: vehicle.adid,
                vehicle_id: vehicleGroup.vehicle_id || vehicle.vehicle_id,
                driver_id: vehicleGroup.driver_id || vehicle.driver_id,
                segment_id: vehicleGroup.segment_id || vehicle.segment_id,
                record_date: vehicle.record_date,
                record_time: vehicle.record_time,
                lat: vehicle.lat,
                lng: vehicle.lng,
                speed: vehicle.speed,
                angle: vehicle.angle,
                direction: vehicle.direction,
                device_time: vehicle.device_time,
                // For backward compatibility, also set the old field names
                latitude: vehicle.lat,
                longitude: vehicle.lng,
                heading: vehicle.angle || vehicle.direction,
                timestamp: vehicle.record_time ? 
                  `${vehicle.record_date} ${vehicle.record_time}` : 
                  new Date().toISOString()
              };
              
              allVehicles.push(processedVehicle);
            });
          }
        });
        
        // Update vehicles without affecting polylines
        setVehicles(allVehicles);
        updateVehicleMarkers(allVehicles);
        setConnectionStatus('connected');
        setConnectionError(null); // Clear any previous errors
        console.log(`Updated ${allVehicles.length} vehicle markers, polylines preserved`);
      } else {
        console.log('No vehicle data available from API');
        setVehicles([]);
        setConnectionStatus('connected'); // API responded but no data
        // Clear existing vehicle markers when no data is available
        vehicleMarkersRef.current.forEach((marker) => {
          if (mapRef.current) {
            mapRef.current.removeLayer(marker);
          }
        });
        vehicleMarkersRef.current.clear();
      }
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
      setVehicles([]);
      setConnectionStatus('error');
      
      // Set user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      if (errorMessage.includes('CORS')) {
        setConnectionError('Unable to connect to the tracking server. This may be due to browser security restrictions. Try refreshing the page or contact support.');
      } else if (errorMessage.includes('fetch')) {
        setConnectionError('Network connection error. Please check your internet connection and try again.');
      } else {
        setConnectionError('Server temporarily unavailable. Retrying automatically...');
      }
      
      // Clear existing vehicle markers on error
      vehicleMarkersRef.current.forEach((marker) => {
        if (mapRef.current) {
          mapRef.current.removeLayer(marker);
        }
      });
      vehicleMarkersRef.current.clear();
    }
  }, [updateVehicleMarkers]);

  // Start vehicle tracking - optimized to prevent map reloading
  const startVehicleTracking = useCallback(() => {
    console.log('Starting vehicle tracking (polylines will remain intact)');
    
    // Clear any existing interval to prevent multiple intervals
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Initial fetch
    fetchAllVehicles();
    
    // Set up interval for regular updates
    intervalRef.current = setInterval(() => {
      console.log('Interval update: fetching vehicles only');
      fetchAllVehicles();
    }, 5000); // Update every 5 seconds to reduce load and prevent excessive rerendering
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
      console.log('Cleaning up map and preventing memory leaks');
      stopVehicleTracking();
      clearMapElements();
      clearVehicleMarkers();
      
      // Ensure interval is cleared
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      
      // Reset polyline tracking flags
      polylinesDrawnRef.current = false;
      currentPolylineDataRef.current = null;
      currentSelectedRoutesRef.current = [];
    };
  }, [startVehicleTracking, stopVehicleTracking, clearMapElements, clearVehicleMarkers]);

  // Handle polyline data changes (new primary method) - with independence from vehicle updates and strict change detection
  useEffect(() => {
    if (!mapRef.current) {
      console.log('Map not ready, skipping polyline update');
      return;
    }

    // More precise change detection to prevent unnecessary redraws
    const currentRouteIds = currentSelectedRoutesRef.current.map(r => r.id).sort().join(',');
    const newRouteIds = selectedRoutesForMap.map(r => r.id).sort().join(',');
    const hasSelectedRoutesChanged = currentRouteIds !== newRouteIds;
    
    // Check if polyline data has actually changed
    const hasPolylineDataChanged = polylineData && (
      !currentPolylineDataRef.current || 
      JSON.stringify(currentPolylineDataRef.current.result) !== JSON.stringify(polylineData.result)
    );
    
    const shouldUpdate = (!polylinesDrawnRef.current && polylineData?.result?.length > 0) || 
                        hasPolylineDataChanged || 
                        hasSelectedRoutesChanged ||
                        (selectedRoutesForMap.length === 0 && polylinesDrawnRef.current);
    
    if (!shouldUpdate) {
      console.log('Polylines preserved - no actual changes detected');
      return;
    }
    
    console.log('Map update triggered:', {
      hasPolylineDataChanged,
      hasSelectedRoutesChanged,
      polylinesDrawn: polylinesDrawnRef.current,
      selectedRoutesCount: selectedRoutesForMap.length,
      clearing: selectedRoutesForMap.length === 0 && polylinesDrawnRef.current
    });
    
    const updatePolylines = async () => {
      // Rate limiting: minimum 500ms between updates
      const now = Date.now();
      if (now - lastPolylineUpdateRef.current < 500) {
        console.log('Rate limiting: Skipping polyline update (too frequent)');
        return;
      }
      lastPolylineUpdateRef.current = now;
      
      if (polylineData && polylineData.result && polylineData.result.length > 0) {
        console.log('Drawing polylines for', selectedRoutesForMap.length, 'selected routes');
        
        currentPolylineDataRef.current = polylineData;
        currentSelectedRoutesRef.current = [...selectedRoutesForMap];
        
        try {
          await drawPolylinesFromGeoJSON(polylineData, selectedRoutesForMap.length > 0 ? selectedRoutesForMap : undefined);
          polylinesDrawnRef.current = true;
          console.log('Polylines drawn successfully');
        } catch (error) {
          console.error('Failed to draw polylines:', error);
        }
      } else if (selectedRoutesForMap && selectedRoutesForMap.length > 0) {
        // Fallback to API method only if no polylineData is provided
        console.log('Using fallback API method for polylines');
        currentSelectedRoutesRef.current = [...selectedRoutesForMap];
        
        try {
          await drawRoutePaths(selectedRoutesForMap);
          polylinesDrawnRef.current = true;
          console.log('Fallback polylines drawn successfully');
        } catch (error) {
          console.error('Failed to draw fallback polylines:', error);
        }
      } else if (selectedRoutesForMap.length === 0 && polylinesDrawnRef.current) {
        // Clear polylines only when no routes are selected
        console.log('Clearing all polylines - no routes selected');
        clearRouteElements(true, true);
        polylinesDrawnRef.current = false;
        currentPolylineDataRef.current = null;
        currentSelectedRoutesRef.current = [];
      }
    };

    // Execute immediately without debounce to prevent flickering
    updatePolylines();
  }, [polylineData, selectedRoutesForMap, drawPolylinesFromGeoJSON, drawRoutePaths, clearRouteElements]);

  return (
    <div className="relative flex-1 h-full">
      <div 
        ref={mapContainer} 
        className="h-full w-full"
        style={{ height: '100%' }}
      />
      
      {/* Status indicator */}
      <StatusIndicator status={connectionStatus} />
      
      {/* Error notification */}
      {connectionError && (
        <ErrorNotification 
          error={connectionError} 
          onDismiss={() => setConnectionError(null)} 
        />
      )}
      
      {/* Polyline loading overlay */}
      {isLoadingPolylines && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-[500]">
          <div className="bg-white rounded-lg shadow-lg p-4 flex items-center space-x-3">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-medium text-gray-700">Loading route data...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapComponent;