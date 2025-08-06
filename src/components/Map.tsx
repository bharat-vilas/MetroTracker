import React, { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  apiService,
  ApiRoute,
  Vehicle,
  RouteStop,
} from "@/services/apiService";
import {
  PolylineResponse,
  processMultiplePolylines,
} from "@/lib/polylineUtils";
import "./Map.css";

// Error notification component
const ErrorNotification: React.FC<{ error: string; onDismiss: () => void }> = ({
  error,
  onDismiss,
}) => (
  <div className="absolute top-4 right-4 z-[1000] max-w-md bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
    <div className="flex items-start">
      <div className="flex-shrink-0">
        <svg
          className="h-5 w-5 text-red-400"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
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
const StatusIndicator: React.FC<{
  status: "connected" | "error" | "loading";
}> = ({ status }) => {
  const statusConfig = {
    connected: { color: "bg-green-500", text: "Refreshed", pulse: false },
    error: { color: "bg-red-500", text: "Refreshing Error", pulse: true },
    loading: { color: "bg-yellow-500", text: "Refreshing...", pulse: true },
  };

  const config = statusConfig[status];

  return (
    <div className=" ml-8 absolute top-3 left-4 z-[1000] bg-white rounded-lg shadow-md p-2">
      <div className=" flex items-center space-x-2">
        <div
          className={`w-3 h-3 rounded-full ${config.color} ${
            config.pulse ? "animate-pulse" : ""
          }`}
        ></div>
        <span className="text-sm font-medium text-gray-700">{config.text}</span>
      </div>
    </div>
  );
};

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface MapComponentProps {
  selectedRoute?: ApiRoute | null;
  onVehicleSelect?: (vehicleId: string) => void;
  selectedRoutesForMap?: ApiRoute[];
  polylineData?: PolylineResponse;
  isLoadingPolylines?: boolean;
  zoomToStop?: {
    latitude: number;
    longitude: number;
    name: string;
    stopNumber?: number;
    eta?: string;
  } | null;
  onVehiclesUpdate?: (vehicles: Vehicle[]) => void;
}

const MapComponent: React.FC<MapComponentProps> = ({
  selectedRoute,
  onVehicleSelect,
  selectedRoutesForMap,
  polylineData,
  isLoadingPolylines = false,
  zoomToStop,
  onVehiclesUpdate,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routeLinesRef = useRef<L.Polyline[]>([]);
  const stopMarkersRef = useRef<L.Marker[]>([]);
  const vehicleMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const stopPopupRef = useRef<L.Popup | null>(null);
  const stopMarkerRef = useRef<L.Marker | null>(null);

  // Route colors for visual distinction
  const routeColors = [
    "#3b82f6",
    "#ef4444",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#f97316",
    "#06b6d4",
    "#84cc16",
  ];

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
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "error" | "loading"
  >("loading");

  const createVehicleIcon = (
    vehicleId: string,
    speed: number = 0,
    direction: number = 0
  ) => {
    const isMoving = speed > 0;

    return L.divIcon({
      html: `
      <div class="vehicle-icon-wrapper ${isMoving ? "vehicle-pulse" : ""}">
        <img 
          src="/img/car_logo.png" 
          alt="Car" 
          class="vehicle-img" 
          style="transform: rotate(${direction}deg);" 
        />
      </div>
    `,
      className: `vehicle-marker vehicle-${vehicleId}`,
      iconSize: [32, 32], // adjust based on actual image size
      iconAnchor: [16, 16], // center the image
    });
  };

  // Clear specific route elements (updated to be more selective)
  const clearRouteElements = useCallback(
    (clearPolylines = true, clearStops = true) => {
      console.log("Clearing route elements", { clearPolylines, clearStops });

      // Clear route polylines only if requested
      if (clearPolylines) {
        routeLinesRef.current.forEach((line) => {
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
        stopMarkersRef.current.forEach((marker) => {
          if (mapRef.current) {
            mapRef.current.removeLayer(marker);
          }
        });
        stopMarkersRef.current = [];
      }
    },
    []
  );

  // Clear all map elements (for complete cleanup)
  const clearMapElements = useCallback(() => {
    console.log("Clearing all map elements");
    clearRouteElements(true, true);
  }, [clearRouteElements]);

  // Clear vehicle markers
  const clearVehicleMarkers = useCallback(() => {
    vehicleMarkersRef.current.forEach((marker) => {
      if (mapRef.current) {
        mapRef.current.removeLayer(marker);
      }
    });
    vehicleMarkersRef.current.clear();
  }, []);

  // Clear stop popup and marker
  const clearStopPopup = useCallback(() => {
    if (stopPopupRef.current && mapRef.current) {
      mapRef.current.closePopup(stopPopupRef.current);
      stopPopupRef.current = null;
    }
    if (stopMarkerRef.current && mapRef.current) {
      mapRef.current.removeLayer(stopMarkerRef.current);
      stopMarkerRef.current = null;
    }
  }, []);

  // Update vehicle markers with smooth transitions
  const updateVehicleMarkers = useCallback((vehicles: Vehicle[]) => {
    if (!mapRef.current) return;

    const newVehicleIds = new Set(vehicles.map((v) => v.vehicle_id));

    vehicles.forEach((vehicle) => {
      const latlng = L.latLng(vehicle.lat, vehicle.lng);
      const existingMarker = vehicleMarkersRef.current.get(vehicle.vehicle_id);

      if (existingMarker) {
        // Update position
        existingMarker.setLatLng(latlng);

        // Update rotation
        const markerEl = existingMarker.getElement();
        if (markerEl) {
          const img = markerEl.querySelector<HTMLImageElement>(".vehicle-img");
          if (img) {
            img.style.transform = `rotate(${vehicle.direction ?? 0}deg)`;
          }
        }

        // Update tooltip
        existingMarker.setTooltipContent(
          `🚗 <strong>ID:</strong> ${vehicle.vehicle_id}<br><strong>Speed:</strong> ${vehicle.speed} km/h<br><strong>Time:</strong> ${vehicle.record_time}`
        );
      } else {
        // Create new marker
        const marker = L.marker(latlng, {
          icon: createVehicleIcon(vehicle.vehicle_id, vehicle.speed),
          zIndexOffset: 1000,
        }).addTo(mapRef.current!);

        marker.bindTooltip(
          `🚗 <strong>ID:</strong> ${vehicle.vehicle_id}<br><strong>Speed:</strong> ${vehicle.speed} km/h<br><strong>Time:</strong> ${vehicle.record_time}`,
          {
            className: "custom-vehicle-tooltip",
            direction: "top",
            offset: [0, -10],
            opacity: 0.95,
          }
        );

        vehicleMarkersRef.current.set(vehicle.vehicle_id, marker);
      }
    });

    // Remove stale markers
    vehicleMarkersRef.current.forEach((marker, vehicleId) => {
      if (!newVehicleIds.has(vehicleId)) {
        mapRef.current!.removeLayer(marker);
        vehicleMarkersRef.current.delete(vehicleId);
      }
    });
  }, []);

  // Create stop marker with color
  const createStopMarker = useCallback((color: string, stopIndex?: number) => {
    const size = 12;
    const borderWidth = 2;

    return L.divIcon({
      html: `<div style="
      width: ${size}px; 
      height: ${size}px; 
      background-color: ${color}; 
      border: ${borderWidth}px solid white; 
      border-radius: 50%; 
    "></div>`,
      className: "stop-marker",
      iconSize: [size + borderWidth * 2, size + borderWidth * 2],
      iconAnchor: [(size + borderWidth * 2) / 2, (size + borderWidth * 2) / 2],
    });
  }, []);

  // Draw polylines from GeoJSON-like data structure
  const drawPolylinesFromGeoJSON = useCallback(
    async (polylineResponse: PolylineResponse, filterRoutes?: ApiRoute[]) => {
      if (!mapRef.current || !polylineResponse?.result) {
        console.warn("Map not ready or no polyline data");
        return;
      }

      const isFirstDraw = !polylinesDrawnRef.current;
      const shouldFilter = filterRoutes && filterRoutes.length > 0;

      // Clear previous polylines/stops only if route selection changes
      clearRouteElements(true, true);

      const processedPolylines = processMultiplePolylines(polylineResponse);
      const allBounds: L.LatLngBounds[] = [];
      const routeStopsMap = new Map<string, RouteStop[]>();

      // Choose which routes to process
      const routesToDraw = shouldFilter
        ? processedPolylines.filter((poly) =>
            filterRoutes.some(
              (r) =>
                r.segment_id === poly.segmentId ||
                r.id === poly.segmentId ||
                r.name === poly.name
            )
          )
        : isFirstDraw
        ? processedPolylines
        : [];

      if (routesToDraw.length === 0) {
        console.log("No routes selected to draw polylines");
        return;
      }

      for (const polylineInfo of routesToDraw) {
        if (polylineInfo.coordinates.length === 0) continue;

        // Draw polyline
        const polyline = L.polyline(polylineInfo.coordinates, {
          color: polylineInfo.style.color,
          weight: polylineInfo.style.weight,
          opacity: polylineInfo.style.opacity,
        })
          .bindPopup(
            `
            <div class="p-2">
              <strong>${polylineInfo.name}</strong><br/>
              Segment ID: ${polylineInfo.segmentId}<br/>
              Points: ${polylineInfo.coordinates.length}
            </div>`
          )
          .addTo(mapRef.current);

        routeLinesRef.current.push(polyline);
        allBounds.push(polyline.getBounds());

        // Fetch and draw stops
        try {
          let routeStops = routeStopsMap.get(polylineInfo.segmentId);

          if (!routeStops) {
            const stopsData = await apiService.getStopsForRoute(
              polylineInfo.name
            );
            routeStops = stopsData?.stops ?? [];
            routeStopsMap.set(polylineInfo.segmentId, routeStops);
          }

          for (let i = 0; i < routeStops.length; i++) {
            const stop = routeStops[i];
            const stopIcon = createStopMarker(
              polylineInfo.style.color,
              i === routeStops.length - 1 ? -1 : i
            );
            const marker = L.marker([stop.latitude, stop.longitude], {
              icon: stopIcon,
            })
              .bindPopup(
                `
              <div class="p-2">
                <strong>${stop.name}</strong><br/>
                Stop ${i + 1} of ${routeStops.length}<br/>
                                 ETA: ${stop.eta || ""}
              </div>
            `
              )
              .addTo(mapRef.current);

            stopMarkersRef.current.push(marker);
          }
        } catch (err) {
          console.warn(`Could not fetch stops for ${polylineInfo.name}`, err);
        }
      }

      // Fit bounds only the first time
      if (allBounds.length > 0 && isFirstDraw) {
        const group = new L.FeatureGroup();
        allBounds.forEach((b) =>
          group.addLayer(L.rectangle(b, { stroke: false, fill: false }))
        );

        mapRef.current.fitBounds(group.getBounds(), {
          padding: [30, 30],
          maxZoom: 15,
        });
      }

      polylinesDrawnRef.current = true;
    },
    [clearRouteElements, createStopMarker]
  );

  // Legacy method - Draw route paths on map using polyline API (only called when no polylineData prop is available)
  const drawRoutePaths = useCallback(
    async (routes: ApiRoute[]) => {
      if (!mapRef.current || routes.length === 0) return;

      console.log(
        "Fallback: Drawing route paths for:",
        routes.map((r) => r.name)
      );

      // Clear previous polylines/stops only if changing selection
      clearRouteElements(true, true);

      try {
        // Try new GeoJSON API first
        const apiPolylineData = await apiService.getGeoJSONPolylines();

        if (apiPolylineData?.result?.length > 0) {
          console.log("Using GeoJSON fallback polyline method");
          await drawPolylinesFromGeoJSON(apiPolylineData, routes); // ⚠️ Make sure it respects `filterRoutes`
          return;
        }

        // Fallback to legacy polyline
        const legacyPolylineData = await apiService.getRoutePolyline();

        if (
          !legacyPolylineData?.routes ||
          legacyPolylineData.routes.length === 0
        ) {
          console.warn("Legacy fallback polyline data empty");
          return;
        }

        const allBounds: L.LatLngBounds[] = [];

        for (let i = 0; i < routes.length; i++) {
          const route = routes[i];
          const match = legacyPolylineData.routes.find(
            (r: any) =>
              r.segment_id === route.segment_id ||
              r.segment_id === route.id ||
              r.route_name === route.name
          );

          if (!match) {
            console.warn(`No legacy polyline found for route: ${route.name}`);
            continue;
          }

          const color = match.color || routeColors[i % routeColors.length];
          const polyInfo = processMultiplePolylines(match);
          const coords = polyInfo.flatMap((p) => p.coordinates);

          if (coords.length === 0) {
            console.warn(`No coordinates for ${route.name}`);
            continue;
          }

          const line = L.polyline(coords, {
            color,
            weight: 4,
            opacity: 0.8,
          })
            .bindPopup(
              `
              <div class="p-2">
                <strong>${route.name}</strong><br/>
                ${coords.length} points
              </div>`
            )
            .addTo(mapRef.current);

          routeLinesRef.current.push(line);
          allBounds.push(line.getBounds());

          // Draw stops
          if (Array.isArray(match.stops)) {
            match.stops.forEach((stop: any, idx: number) => {
              const stopIcon = createStopMarker(color);
              const marker = L.marker([stop.latitude, stop.longitude], {
                icon: stopIcon,
              })
                .bindPopup(
                  `
                  <div class="p-2">
                    <strong>${stop.name}</strong><br/>
                    Stop ${idx + 1}<br/>
                    ${stop.eta ? `ETA: ${stop.eta}` : ""}
                  </div>
                `
                )
                .addTo(mapRef.current);

              stopMarkersRef.current.push(marker);
            });
          }
        }

        // Only fit bounds on first polyline draw (avoid zoom reset on update)
        if (allBounds.length > 0 && !polylinesDrawnRef.current) {
          const group = new L.FeatureGroup();
          allBounds.forEach((b) =>
            group.addLayer(L.rectangle(b, { stroke: false, fill: false }))
          );

          mapRef.current.fitBounds(group.getBounds(), {
            padding: [20, 20],
            maxZoom: 15,
          });
        }

        polylinesDrawnRef.current = true;
      } catch (err) {
        console.error("Error drawing fallback route paths:", err);
      }
    },
    [
      clearRouteElements,
      createStopMarker,
      routeColors,
      drawPolylinesFromGeoJSON,
    ]
  );

  // Fetch all vehicles - independent of polyline management with rate limiting
  const fetchAllVehicles = useCallback(async () => {
    const now = Date.now();

    // Limit update frequency
    if (now - lastVehicleUpdateRef.current < 4000) {
      console.log("Rate limiting: Skipping vehicle update");
      return;
    }
    lastVehicleUpdateRef.current = now;

    try {
      setConnectionStatus("loading");
      const avlData = await apiService.getAvlData();

      if (avlData?.result && Array.isArray(avlData.result)) {
        const allVehicles: Vehicle[] = [];

        avlData.result.forEach((vehicleGroup) => {
          if (Array.isArray(vehicleGroup.avl_data)) {
            vehicleGroup.avl_data.forEach((vehicle) => {
              const v: Vehicle = {
                id: vehicle.id,
                adid: vehicle.adid,
                vehicle_id: vehicleGroup.vehicle_id || vehicle.vehicle_id,
                driver_id: vehicleGroup.driver_id || vehicle.driver_id,
                segment_id: vehicleGroup.segment_id || vehicle.segment_id,
                lat: vehicle.lat,
                lng: vehicle.lng,
                speed: vehicle.speed,
                angle: vehicle.angle,
                direction: vehicle.direction,
                device_time: vehicle.device_time,
                latitude: vehicle.lat,
                longitude: vehicle.lng,
                heading: vehicle.angle || vehicle.direction,
                timestamp:
                  `${vehicle.record_date} ${vehicle.record_time}` ||
                  new Date().toISOString(),
              };

              allVehicles.push(v);
            });
          }
        });

        // Smooth marker update logic (without removing all and re-adding)
        const allowedSegmentIds = new Set<string>(
          selectedRoutesForMap.map((route) => route.segment_id)
        );

        const filteredVehicles = allVehicles.filter((vehicle) =>
          allowedSegmentIds.has(vehicle.segment_id ?? "")
        );
        console.log(
          "allVehicles : ",
          allVehicles,
          "selectedRoutesForMap",
          selectedRoutesForMap,
          "filteredVehicles",
          filteredVehicles
        );
        filteredVehicles.forEach((vehicle) => {
          const key = String(vehicle.vehicle_id);
          const latlng = L.latLng(vehicle.lat, vehicle.lng);
          const icon = createVehicleIcon(
            vehicle.vehicle_id,
            vehicle.speed,
            vehicle.direction
          );
          const existingMarker = vehicleMarkersRef.current.get(key);

          if (existingMarker) {
            const startLatLng = existingMarker.getLatLng();
            const endLatLng = latlng;
            const duration = 4000;
            const steps = 60;
            let currentStep = 0;

            const latStep = (endLatLng.lat - startLatLng.lat) / steps;
            const lngStep = (endLatLng.lng - startLatLng.lng) / steps;

            const animate = () => {
              currentStep++;
              const intermediateLat = startLatLng.lat + latStep * currentStep;
              const intermediateLng = startLatLng.lng + lngStep * currentStep;

              existingMarker.setLatLng([intermediateLat, intermediateLng]);

              // 🔄 Rotate image during movement
              const markerEl = existingMarker.getElement();
              if (markerEl) {
                const img =
                  markerEl.querySelector<HTMLImageElement>(".vehicle-img");
                if (img) {
                  img.style.transform = `rotate(${vehicle.direction ?? 0}deg)`;
                }
              }

              if (currentStep < steps) {
                requestAnimationFrame(animate);
              }
            };

            animate();

            // Update icon (in case movement status changes pulse effect)
            existingMarker.setIcon(icon);

            // 🧾 Update tooltip content
            existingMarker.setTooltipContent(
              `🚗 <strong>ID:</strong> ${vehicle.vehicle_id}<br>
            <strong>Speed:</strong> ${vehicle.speed} km/h<br>
            <strong>Time:</strong> ${vehicle.device_time}`
            );
          } else {
            // 🚗 First time marker creation
            const newMarker = L.marker(latlng, {
              icon,
            }).addTo(mapRef.current!);

            newMarker.bindTooltip(
              `🚗 <strong>ID:</strong> ${vehicle.vehicle_id}<br>
            <strong>Speed:</strong> ${vehicle.speed} km/h<br>
            <strong>Time:</strong> ${vehicle.device_time}`,
              {
                className: "custom-vehicle-tooltip",
                direction: "top",
                offset: [0, -10],
                opacity: 0.95,
              }
            );

            vehicleMarkersRef.current.set(key, newMarker);
          }
        });
        setVehicles(filteredVehicles);
        // Pass all vehicles (before filtering) to RoutesList for status determination
        onVehiclesUpdate?.(allVehicles);
        setConnectionStatus("connected");
        setConnectionError(null);
      } else {
        console.warn("No AVL data returned");
        setVehicles([]);
        onVehiclesUpdate?.([]);
        setConnectionStatus("connected");

        // Only clear markers, preserve routes
        vehicleMarkersRef.current.forEach((marker) => {
          mapRef.current?.removeLayer(marker);
        });
        vehicleMarkersRef.current.clear();
      }
    } catch (error) {
      console.error("Vehicle fetch failed:", error);
      setConnectionStatus("error");
      setVehicles([]);
      onVehiclesUpdate?.([]);

      const message = error instanceof Error ? error.message : "Unknown error";
      if (message.includes("CORS")) {
        setConnectionError(
          "Tracking server unreachable due to browser CORS restrictions."
        );
      } else if (message.includes("fetch")) {
        setConnectionError("Network error while fetching vehicle data.");
      } else {
        setConnectionError("Server error while fetching vehicle data.");
      }

      // Only clear markers, preserve routes
      vehicleMarkersRef.current.forEach((marker) => {
        mapRef.current?.removeLayer(marker);
      });
      vehicleMarkersRef.current.clear();
    }
  }, [selectedRoutesForMap, updateVehicleMarkers]);

  // Start vehicle tracking - optimized to prevent map reloading
  const startVehicleTracking = useCallback(() => {
    console.log("Starting vehicle tracking (polylines will remain intact)");

    // Clear any existing interval to prevent multiple intervals
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Initial fetch
    fetchAllVehicles();

    // Set up interval for regular updates
    intervalRef.current = setInterval(() => {
      console.log("Interval update: fetching vehicles only");
      fetchAllVehicles();
    }, 5000); // Update every 5 seconds to reduce load and prevent excessive rerendering
  }, [fetchAllVehicles]);

  // Stop vehicle tracking
  const stopVehicleTracking = useCallback(() => {
    console.log("Stopping vehicle tracking");
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    clearVehicleMarkers();
  }, [clearVehicleMarkers]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    console.log("Initializing map");

    // Create map
    const map = L.map(mapContainer.current, {
      center: [43.607483, -83.870869], // Default to Boston coordinates
      zoom: 13,
      zoomControl: true,
      attributionControl: false,
    });

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    mapRef.current = map;

    // Start vehicle tracking
    startVehicleTracking();

    // Cleanup function
    return () => {
      console.log("Cleaning up map and preventing memory leaks");
      stopVehicleTracking();
      clearMapElements();
      clearVehicleMarkers();

      // Clear stop popup and marker
      clearStopPopup();

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
  }, [
    startVehicleTracking,
    stopVehicleTracking,
    clearMapElements,
    clearVehicleMarkers,
    clearStopPopup,
  ]);

  // Handle polyline data changes (new primary method) - with independence from vehicle updates and strict change detection
  useEffect(() => {
    if (!mapRef.current) {
      console.log("Map not ready, skipping polyline update");
      return;
    }
    console.log("useeffect", selectedRoutesForMap);
    if (selectedRoutesForMap.length === 0) {
      if (polylinesDrawnRef.current) {
        console.log("Clearing all polylines - no routes selected");
        clearRouteElements(true, true);
        polylinesDrawnRef.current = false;
        currentPolylineDataRef.current = null;
        currentSelectedRoutesRef.current = [];
      }
      return; // ⛔ Do not proceed to draw anything
    }
    // More precise change detection to prevent unnecessary redraws
    const currentRouteIds = currentSelectedRoutesRef.current
      .map((r) => r.id)
      .sort()
      .join(",");
    const newRouteIds = selectedRoutesForMap
      .map((r) => r.id)
      .sort()
      .join(",");
    const hasSelectedRoutesChanged = currentRouteIds !== newRouteIds;

    // Check if polyline data has actually changed
    const hasPolylineDataChanged =
      polylineData &&
      (!currentPolylineDataRef.current ||
        JSON.stringify(currentPolylineDataRef.current.result) !==
          JSON.stringify(polylineData.result));

    const shouldUpdate =
      selectedRoutesForMap.length > 0 && // ⬅️ prevent initial draw
      ((!polylinesDrawnRef.current && polylineData?.result?.length > 0) ||
        hasPolylineDataChanged ||
        hasSelectedRoutesChanged);
    if (!shouldUpdate) {
      console.log("Polylines preserved - no actual changes detected");
      return;
    }

    console.log("Map update triggered:", {
      hasPolylineDataChanged,
      hasSelectedRoutesChanged,
      polylinesDrawn: polylinesDrawnRef.current,
      selectedRoutesCount: selectedRoutesForMap.length,
      clearing: selectedRoutesForMap.length === 0 && polylinesDrawnRef.current,
    });

    const updatePolylines = async () => {
      // Rate limiting: minimum 500ms between updates
      const now = Date.now();
      if (now - lastPolylineUpdateRef.current < 500) {
        console.log("Rate limiting: Skipping polyline update (too frequent)");
        return;
      }
      lastPolylineUpdateRef.current = now;

      if (
        polylineData &&
        polylineData.result &&
        polylineData.result.length > 0
      ) {
        console.log(
          "Drawing polylines for",
          selectedRoutesForMap.length,
          "selected routes"
        );

        currentPolylineDataRef.current = polylineData;
        currentSelectedRoutesRef.current = [...selectedRoutesForMap];

        try {
          await drawPolylinesFromGeoJSON(
            polylineData,
            selectedRoutesForMap.length > 0 ? selectedRoutesForMap : undefined
          );
          polylinesDrawnRef.current = true;
          console.log("Polylines drawn successfully");
        } catch (error) {
          console.error("Failed to draw polylines:", error);
        }
      } else if (selectedRoutesForMap && selectedRoutesForMap.length > 0) {
        // Fallback to API method only if no polylineData is provided
        console.log("Using fallback API method for polylines");
        currentSelectedRoutesRef.current = [...selectedRoutesForMap];

        try {
          await drawRoutePaths(selectedRoutesForMap);
          polylinesDrawnRef.current = true;
          console.log("Fallback polylines drawn successfully");
        } catch (error) {
          console.error("Failed to draw fallback polylines:", error);
        }
      } else if (
        selectedRoutesForMap.length === 0 &&
        polylinesDrawnRef.current
      ) {
        // Clear polylines only when no routes are selected
        console.log("Clearing all polylines - no routes selected");
        clearRouteElements(true, true);
        polylinesDrawnRef.current = false;
        currentPolylineDataRef.current = null;
        currentSelectedRoutesRef.current = [];
      }
    };

    // Execute immediately without debounce to prevent flickering
    updatePolylines();
  }, [
    polylineData,
    selectedRoutesForMap,
    drawPolylinesFromGeoJSON,
    drawRoutePaths,
    clearRouteElements,
  ]);

  // Handle zoom to stop
  useEffect(() => {
    if (zoomToStop && mapRef.current) {
      const { latitude, longitude, name, stopNumber, eta } = zoomToStop;

      // Clear any existing stop popup
      if (stopPopupRef.current && mapRef.current) {
        mapRef.current.closePopup(stopPopupRef.current);
        stopPopupRef.current = null;
      }

      // Zoom to the stop location
      mapRef.current.setView([latitude, longitude], 16);

      // Create and open popup at the stop location (no new marker)
      const popup = L.popup({
        closeButton: true,
        autoClose: false,
        closeOnClick: false,
        className: "stop-popup",
        maxWidth: 200,
        maxHeight: 150,
      })
        .setLatLng([latitude, longitude])
        .setContent(
          `
          <div class="p-1">
            <div class="text-xs font-medium text-gray-800 mb-1">🚏 ${name}</div>
                         <div class="text-xs text-gray-600">
                               <strong>Stop Number:</strong> ${
                                 stopNumber || ""
                               }<br>
                <strong>ETA:</strong> ${eta || ""}
             </div>
          </div>
        `
        )
        .openOn(mapRef.current);

      stopPopupRef.current = popup;

      // Keep the popup open - no auto-close timeout

      return () => {
        if (stopPopupRef.current && mapRef.current) {
          mapRef.current.closePopup(stopPopupRef.current);
          stopPopupRef.current = null;
        }
      };
    }
  }, [zoomToStop]);

  return (
    <div className="relative flex-1 h-full">
      <div ref={mapContainer} className="h-full w-full" />

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
            <span className="text-sm font-medium text-gray-700">
              Loading route data...
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapComponent;
