const BASE_URL = 'https://tracker_baym.hbssweb.com';

// Base64 decode helper with improved error handling
const decodeBase64 = (encodedData: string) => {
  try {
    // Check if the data looks like base64
    if (!encodedData || encodedData.trim().length === 0) {
      console.warn('Empty encoded data provided');
      return null;
    }
    
    // Remove any whitespace and check if it's valid base64 format
    const cleanedData = encodedData.trim();
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleanedData)) {
      console.warn('Data does not appear to be valid base64:', cleanedData.substring(0, 100));
      return null;
    }
    
    const decodedString = atob(cleanedData);
    const parsedData = JSON.parse(decodedString);
    
    console.log('Successfully decoded base64 data');
    return parsedData;
  } catch (error) {
    console.error('Failed to decode base64 data:', error);
    console.error('Input data (first 100 chars):', encodedData?.substring(0, 100));
    return null;
  }
};

// CORS proxy configuration with multiple fallback options
const CORS_PROXIES = [
  'https://cors-anywhere.herokuapp.com/',
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?'
];

// Request cache to prevent excessive API calls
const apiCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// Cache TTL settings (in milliseconds)
const CACHE_TTL = {
  ROUTES: 5 * 60 * 1000,        // 5 minutes
  STOPS: 10 * 60 * 1000,        // 10 minutes  
  POLYLINES: 15 * 60 * 1000,    // 15 minutes
  AVL_DATA: 0,                  // No cache for real-time data
  SEGMENTS: 2 * 60 * 1000       // 2 minutes
};

// Cache helper functions
const getCacheKey = (endpoint: string, params?: string): string => {
  return params ? `${endpoint}:${params}` : endpoint;
};

const getCachedData = (key: string): any | null => {
  const cached = apiCache.get(key);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    console.log(`Cache hit for: ${key}`);
    return cached.data;
  }
  if (cached) {
    apiCache.delete(key); // Remove expired cache
  }
  return null;
};

const setCachedData = (key: string, data: any, ttl: number): void => {
  apiCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });
  console.log(`Cached data for: ${key}, TTL: ${ttl}ms`);
};

// CORS proxy fallback with retry mechanism
const fetchWithCORS = async (url: string, options?: RequestInit): Promise<Response> => {
  const cacheKey = getCacheKey(url);
  
  // Check cache first (except for AVL data which should always be fresh)
  if (!url.includes('GetAvlData')) {
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return new Response(JSON.stringify(cachedData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  console.log(`Attempting to fetch: ${url}`);
  
  // Try direct fetch first
  try {
    const response = await fetch(url, {
      ...options,
      mode: 'cors',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });
    
    if (response.ok) {
      console.log('Direct fetch successful');
      return response;
    }
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  } catch (directError) {
    console.warn('Direct fetch failed:', directError);
    
    // Try CORS proxies as fallbacks
    for (let i = 0; i < CORS_PROXIES.length; i++) {
      const proxyUrl = `${CORS_PROXIES[i]}${encodeURIComponent(url)}`;
      console.log(`Trying CORS proxy ${i + 1}/${CORS_PROXIES.length}: ${CORS_PROXIES[i]}`);
      
      try {
        const response = await fetch(proxyUrl, {
          ...options,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...options?.headers
          }
        });
        
        if (response.ok) {
          console.log(`CORS proxy ${i + 1} successful`);
          return response;
        } else {
          console.warn(`CORS proxy ${i + 1} failed: ${response.status}`);
        }
      } catch (proxyError) {
        console.warn(`CORS proxy ${i + 1} error:`, proxyError);
        continue;
      }
    }
    
    // If all proxies fail, throw the original error with helpful message
    throw new Error(`CORS Error: All fetch attempts failed. Original error: ${directError.message}. This might be due to:\n1. Server doesn't allow cross-origin requests\n2. CORS proxy services are down\n3. Network connectivity issues\n\nTry running the app from the same domain as the API, or configure the API server to allow CORS.`);
  }
};

// API service functions
export const apiService = {
  async getRoutes() {
    const cacheKey = getCacheKey('GetAllRoutes');
    
    try {
      // Check cache first
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        return cachedData;
      }
      
      // Get routes from new endpoint
      const response = await fetchWithCORS(`${BASE_URL}/GetAllRoutes`);
      const data = await response.json();
      
      if (data?.status === 'OK' && data.result) {
        const result = {
          status: 'OK',
          routes: data.result.map((route: any) => ({
            id: route.route_id || route.id,
            name: route.description || route.route_id,
            segment_id: route.segment_id,
            status: route.status || 'active',
            startTime: route.start_time ? Math.floor(route.start_time / 60).toString().padStart(2, '0') + ':' + (route.start_time % 60).toString().padStart(2, '0') : '06:00',
            endTime: route.end_time ? Math.floor(route.end_time / 60).toString().padStart(2, '0') + ':' + (route.end_time % 60).toString().padStart(2, '0') : '22:00'
          }))
        };
        
        // Cache the result
        setCachedData(cacheKey, result, CACHE_TTL.ROUTES);
        return result;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch routes:', error);
      return null;
    }
  },

  async getStopsForRoute(routeName: string) {
    const cacheKey = getCacheKey('GetStopsData', routeName);
    
    try {
      // Check cache first
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        return cachedData;
      }
      
      const encodedRouteName = encodeURIComponent(routeName);
      const response = await fetchWithCORS(`${BASE_URL}/GetStopsData?data=${encodedRouteName}`);
      const data = await response.json();
      
      if (data?.status === 'OK' && data.result) {
        const result = {
          status: 'OK',
          stops: data.result.map((stop: any) => ({
            id: stop.stop_id || stop.id,
            name: stop.stop_name || stop.name,
            latitude: parseFloat(stop.latitude || stop.lat),
            longitude: parseFloat(stop.longitude || stop.lng),
            eta: stop.eta || null,
            sequence: stop.sequence || 0
          })).sort((a: any, b: any) => a.sequence - b.sequence)
        };
        
        // Cache the result
        setCachedData(cacheKey, result, CACHE_TTL.STOPS);
        return result;
      }
      
      const emptyResult = {
        status: 'OK',
        stops: []
      };
      
      // Cache empty results too to prevent repeated failed requests
      setCachedData(cacheKey, emptyResult, CACHE_TTL.STOPS);
      return emptyResult;
    } catch (error) {
      console.error('Failed to fetch stops for route:', error);
      return null;
    }
  },

  async getLoadedSegments() {
    try {
      const response = await fetchWithCORS(`${BASE_URL}/GetLoadedSegments?data=ALL`);
      const encodedData = await response.text();
      return decodeBase64(encodedData);
    } catch (error) {
      console.error('Failed to fetch loaded segments:', error);
      return null;
    }
  },

  async getDisconnectedSegments() {
    try {
      const response = await fetchWithCORS(`${BASE_URL}/GetDisconnectedSegments?data=ALL`);
      const encodedData = await response.text();
      return decodeBase64(encodedData);
    } catch (error) {
      console.error('Failed to fetch disconnected segments:', error);
      return null;
    }
  },

  async getAvlData() {
    try {
      // AVL data should always be fresh, no caching
      console.log('Fetching fresh AVL data (real-time, no cache)');
      const response = await fetchWithCORS(`${BASE_URL}/GetAvlData?data=ALL`);
      
      // Check response status first
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      console.log('AVL Data response content-type:', contentType);
      
      // Handle different response types
      let data;
      if (contentType && contentType.includes('application/json')) {
        // Direct JSON response
        data = await response.json();
        console.log('AVL Data direct JSON received');
        return data;
      } else {
        // Try as base64 encoded text
        const encodedData = await response.text();
        console.log('AVL Data raw response (first 200 chars):', encodedData.substring(0, 200));
        
        // Check if it's actually base64 encoded
        if (encodedData && !encodedData.startsWith('<') && !encodedData.startsWith('{')) {
          const decodedData = decodeBase64(encodedData);
          if (decodedData) {
            console.log('AVL Data decoded successfully');
            return decodedData;
          }
        } else {
          // Try parsing as direct JSON
          try {
            data = JSON.parse(encodedData);
            console.log('AVL Data parsed as JSON');
            return data;
          } catch (parseError) {
            console.warn('Failed to parse response as JSON:', parseError);
          }
        }
      }
      
      // If we get here, something went wrong
      console.warn('Unable to process AVL data response');
      throw new Error('Invalid response format');
      
    } catch (error) {
      console.error('Failed to fetch AVL data:', error);
      return null;
    }
  },

  async getVehiclesByRoute(routeId: string) {
    try {
      const avlData = await this.getAvlData();
      if (!avlData?.result) return [];

      return avlData.result.filter((vehicle: any) => 
        vehicle.segment_id.includes(routeId.replace('R', '')) || 
        vehicle.segment_id.includes('ROUTE')
      );
    } catch (error) {
      console.error('Failed to fetch vehicles for route:', error);
      return [];
    }
  },

  async getAllStopsWithETAForRoutes(routeNames: string[]) {
    try {
      const encodedRouteNames = routeNames.join(',');
      const response = await fetchWithCORS(`${BASE_URL}/GetAllStopsWithETAForRoute?data=${encodedRouteNames}`);
      const data = await response.json();
      
      if (data?.status === 'OK' && data.result) {
        return {
          status: 'OK',
          routes: data.result.map((routeData: any) => ({
            routeName: routeData.route_name || routeData.segment_id,
            stops: routeData.stops?.map((stop: any) => ({
              id: stop.stop_id || stop.id,
              name: stop.stop_name || stop.name,
              latitude: parseFloat(stop.latitude || stop.lat),
              longitude: parseFloat(stop.longitude || stop.lng),
              eta: stop.eta || null,
              sequence: stop.sequence || 0
            })).sort((a: any, b: any) => a.sequence - b.sequence) || []
          }))
        };
      }
      
      return {
        status: 'OK',
        routes: []
      };
    } catch (error) {
      console.error('Failed to fetch stops with ETA for routes:', error);
      return {
        status: 'OK',
        routes: []
      };
    }
  },

  async getRoutePolyline() {
    const cacheKey = getCacheKey('GetRoutePolyline');
    
    try {
      // Check cache first
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        return cachedData;
      }
      
      const response = await fetchWithCORS(`${BASE_URL}/GetRoutePolyline?data=ALL`);
      const data = await response.json();
      
      if (data?.status === 'OK' && data.result) {
        const result = {
          status: 'OK',
          routes: data.result.map((routeData: any) => ({
            segment_id: routeData.segment_id,
            route_name: routeData.route_name || routeData.segment_id,
            color: routeData.color || '#3b82f6',
            coordinates: routeData.coordinates || [],
            polyline: routeData.polyline || '',
            stops: routeData.stops?.map((stop: any) => ({
              id: stop.stop_id || stop.id,
              name: stop.stop_name || stop.name,
              latitude: parseFloat(stop.latitude || stop.lat),
              longitude: parseFloat(stop.longitude || stop.lng),
              eta: stop.eta || null,
              sequence: stop.sequence || 0
            })).sort((a: any, b: any) => a.sequence - b.sequence) || []
          }))
        };
        
        // Cache the result
        setCachedData(cacheKey, result, CACHE_TTL.POLYLINES);
        return result;
      }
      
      const emptyResult = {
        status: 'OK',
        routes: []
      };
      
      // Cache empty results
      setCachedData(cacheKey, emptyResult, CACHE_TTL.POLYLINES);
      return emptyResult;
    } catch (error) {
      console.error('Failed to fetch route polyline:', error);
      return {
        status: 'OK',
        routes: []
      };
    }
    },

  // New method to fetch GeoJSON-style polyline data
  async getGeoJSONPolylines() {
    const cacheKey = getCacheKey('GetGeoJSONPolylines');
    
    try {
      // Check cache first
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        return cachedData;
      }
      
      const response = await fetchWithCORS(`${BASE_URL}/GetRoutePolyline?data=ALL`);
      const data = await response.json();
      
      console.log('Raw polyline API response:', data);
      
      if (data?.status === 'OK' && data.result && Array.isArray(data.result)) {
        // Return the data in the format expected by the polyline utilities
        const result = {
          cmd_name: data.cmd_name || "GetRoutePolyline",
          status: data.status,
          result: data.result.map((item: any, index: number) => {
            console.log(`Processing polyline item ${index}:`, item);
            
            // Handle the actual data structure you provided
            return {
              idx: item.idx !== undefined ? item.idx : index,
              segment_id: item.segment_id || `ROUTE_${index}`,
              polyline_latlng: {
                features: [{
                  geometry: {
                    type: "LineString",
                    coordinates: this.extractCoordinatesFromPolylineData(item)
                  },
                  properties: {
                    name: item.segment_id || `Route ${index + 1}`,
                    type: "Feature"
                  }
                }],
                type: "FeatureCollection"
              },
              polyline_style: {
                color: item.polyline_style?.color || item.color || '#3b82f6',
                weight: item.polyline_style?.weight || 5,
                opacity: item.polyline_style?.opacity || 1
              }
            };
          })
        };
        
        // Cache the result
        setCachedData(cacheKey, result, CACHE_TTL.POLYLINES);
        return result;
      }
      
      console.warn('Invalid polyline response structure:', data);
      const emptyResult = {
        cmd_name: "GetRoutePolyline",
        status: "OK",
        result: []
      };
      
      // Cache empty results
      setCachedData(cacheKey, emptyResult, CACHE_TTL.POLYLINES);
      return emptyResult;
    } catch (error) {
      console.error('Failed to fetch GeoJSON polylines:', error);
      return {
        cmd_name: "GetRoutePolyline",
        status: "ERROR",
        result: []
      };
    }
  },

  // Helper method to extract coordinates from various possible data structures
  extractCoordinatesFromPolylineData(item: any): number[][] {
    try {
      // Method 1: Check for the structure you described: polyline_latlng.features[0].geometry.coordinates
      if (item.polyline_latlng?.features?.[0]?.geometry?.coordinates) {
        const coords = item.polyline_latlng.features[0].geometry.coordinates;
        console.log('Found coordinates in polyline_latlng.features[0].geometry.coordinates:', coords.length);
        
        // Handle your format: each coordinate is [lng, lat, elevation]
        return coords.map((coord: any) => {
          if (Array.isArray(coord) && coord.length >= 2) {
            return [coord[0], coord[1]]; // [longitude, latitude]
          }
          console.warn('Invalid coordinate format:', coord);
          return [0, 0];
        });
      }
      
      // Method 2: Check for direct coordinates array
      if (item.coordinates && Array.isArray(item.coordinates)) {
        console.log('Found coordinates in direct coordinates array:', item.coordinates.length);
        return item.coordinates.map((coord: any) => {
          if (Array.isArray(coord) && coord.length >= 2) {
            return [coord[0], coord[1]];
          }
          return [0, 0];
        });
      }
      
      // Method 3: Check for encoded polyline string
      if (item.polyline && typeof item.polyline === 'string') {
        console.log('Found encoded polyline string, length:', item.polyline.length);
        // This would need to be decoded - for now return empty
        return [];
      }
      
      console.warn('No coordinates found in polyline item:', item);
      return [];
    } catch (error) {
      console.error('Error extracting coordinates:', error);
      return [];
    }
  }
};

// Types for the API responses
export interface ApiRoute {
  id: string;
  name: string;
  segment_id: string;
  status: string;
  startTime?: string;
  endTime?: string;
}

export interface RouteStop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  eta?: string;
  sequence?: number;
}

export interface RouteStopsResponse {
  status: string;
  stops: RouteStop[];
}

export interface RoutesResponse {
  status: string;
  routes: ApiRoute[];
}

export interface LoadedSegmentsResponse {
  cmd_name: string;
  status: string;
  result: string[];
}

export interface DisconnectedSegmentsResponse {
  cmd_name: string;
  status: string;
  result: string[];
}

export interface VehicleAvlData {
  id: number;
  adid?: number;
  vehicle_id: string;
  driver_id?: string;
  segment_id?: string;
  record_date?: string;
  record_time?: string;
  lat: number;          // Changed from latitude
  lng: number;          // Changed from longitude
  speed?: number;
  angle?: number;       // Added angle field
  direction?: number;   // Added direction field
  device_time?: string; // Added device_time field
  heading?: number;     // Keep for backward compatibility
  latitude?: number;    // Keep for backward compatibility
  longitude?: number;   // Keep for backward compatibility
  timestamp?: string;   // Keep for backward compatibility
}

export interface AvlDataResponse {
  cmd_name: string;
  status: string;
  result: Array<{
    idx: number;
    vehicle_id: string;
    driver_id: string;
    segment_id: string;
    avl_data: VehicleAvlData[];
  }>;
}