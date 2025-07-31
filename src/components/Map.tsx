import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ApiRoute, VehicleAvlData, RouteStop, apiService } from '@/services/apiService';
import { processPolylineData } from '@/lib/polylineUtils';

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
}

const MapComponent: React.FC<MapProps> = ({ selectedRoute, onVehicleSelect, selectedRoutesForMap = [] }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const routeLinesRef = useRef<L.Polyline[]>([]);
  const vehicleMarkersRef = useRef(new Map<string, L.Marker>());
  const [vehicles, setVehicles] = useState<VehicleAvlData[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Route colors for different routes
  const routeColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
  ];

  console.log('Map component rendering', { 
    selectedRoute: selectedRoute?.name, 
    selectedRoutesForMap: selectedRoutesForMap?.map(r => r.name) 
  });

  // Custom vehicle icon creator
  const createVehicleIcon = () => {
    const color = '#22c55e'; // Green for active vehicles
    
    return L.divIcon({
      html: `<div style="
        width: 16px; 
        height: 16px; 
        background-color: ${color}; 
        border: 2px solid white; 
        border-radius: 50%; 
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        animation: pulse 2s infinite;
      "></div>
      <style>
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
      </style>`,
      className: 'vehicle-marker',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
  };

  // Clear all map elements
  const clearMapElements = useCallback(() => {
    console.log('Clearing map elements');
    // Clear route polylines
    routeLinesRef.current.forEach(line => {
      if (mapRef.current) {
        mapRef.current.removeLayer(line);
      }
    });
    routeLinesRef.current = [];

    // Clear stop markers
    markersRef.current.forEach(marker => {
      if (mapRef.current) {
        mapRef.current.removeLayer(marker);
      }
    });
    markersRef.current = [];
  }, []);

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
          icon: createVehicleIcon()
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
  const createStopMarker = useCallback((color: string) => {
    return L.divIcon({
      html: `<div style="
        width: 12px; 
        height: 12px; 
        background-color: ${color}; 
        border: 2px solid white; 
        border-radius: 50%; 
        box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      "></div>`,
      className: 'stop-marker',
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
  }, []);

  // Draw route paths on map using polyline API
  const drawRoutePaths = useCallback(async (routes: ApiRoute[]) => {
    if (!mapRef.current || !routes.length) return;

    console.log('Drawing route paths for routes:', routes.map(r => r.name));

    clearMapElements();

    try {
      // Fetch polyline data for all routes
      const polylineData = await apiService.getRoutePolyline();
      
      if (!polylineData?.routes) {
        console.warn('No polyline data available');
        return;
      }

      const allBounds: L.LatLngBounds[] = [];

      routes.forEach((route, index) => {
        // Find matching polyline data for this route
        const routePolylineData = polylineData.routes.find(
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
  }, [clearMapElements, createStopMarker, routeColors]);

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
    }, 5000); // Update every 5 seconds
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

  // Handle selected routes changes
  useEffect(() => {
    console.log('Selected routes changed:', selectedRoutesForMap);
    
    if (selectedRoutesForMap && selectedRoutesForMap.length > 0) {
      drawRoutePaths(selectedRoutesForMap);
    } else {
      clearMapElements();
    }
  }, [selectedRoutesForMap, drawRoutePaths, clearMapElements]);

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