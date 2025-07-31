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

// CORS proxy fallback for development
const fetchWithCORS = async (url: string) => {
  try {
    // Try direct fetch first
    const response = await fetch(url, {
      mode: 'cors',
      headers: {
        'Accept': 'application/json',
      }
    });
    return response;
  } catch (error) {
    console.warn('CORS error, using mock data:', error);
    // Return mock response for development
    throw new Error('CORS_ERROR');
  }
};

// API service functions
export const apiService = {
  async getRoutes() {
    try {
      // Get routes from new endpoint
      const response = await fetchWithCORS(`${BASE_URL}/GetAllRoutes`);
      const data = await response.json();
      
      if (data?.status === 'OK' && data.result) {
        return {
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
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch routes:', error);
      // Return mock routes for development
      return {
        status: 'OK',
        routes: [
          { id: 'ROUTE_01', name: 'ROUTE 01 Weekday', segment_id: 'S90101', status: 'active', startTime: '06:00', endTime: '22:00' },
          { id: 'ROUTE_02', name: 'ROUTE 02 Express', segment_id: 'S90201', status: 'active', startTime: '07:00', endTime: '21:00' },
          { id: 'ROUTE_03', name: 'ROUTE 03 Local', segment_id: 'S90301', status: 'active', startTime: '08:00', endTime: '20:00' },
          { id: 'ROUTE_04', name: 'ROUTE 04 Weekend', segment_id: 'S90401', status: 'active', startTime: '09:00', endTime: '19:00' },
          { id: 'ROUTE_05', name: 'ROUTE 05 Night', segment_id: 'S90501', status: 'active', startTime: '22:00', endTime: '05:00' },
        ]
      };
    }
  },

  async getStopsForRoute(routeName: string) {
    try {
      const encodedRouteName = encodeURIComponent(routeName);
      const response = await fetchWithCORS(`${BASE_URL}/GetStopsData?data=${encodedRouteName}`);
      const data = await response.json();
      
      if (data?.status === 'OK' && data.result) {
        return {
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
      }
      
      return {
        status: 'OK',
        stops: []
      };
    } catch (error) {
      console.error('Failed to fetch stops for route:', error);
      // Return mock stops for development
      return {
        status: 'OK',
        stops: [
          { id: '1', name: 'Main Terminal', latitude: 42.3601, longitude: -71.0589, eta: '5 min', sequence: 1 },
          { id: '2', name: 'Downtown Plaza', latitude: 42.3651, longitude: -71.0639, eta: '12 min', sequence: 2 },
          { id: '3', name: 'University Ave', latitude: 42.3701, longitude: -71.0689, eta: '18 min', sequence: 3 }
        ]
      };
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
        console.log('AVL Data direct JSON:', data);
        return data;
      } else {
        // Try as base64 encoded text
        const encodedData = await response.text();
        console.log('AVL Data raw response (first 200 chars):', encodedData.substring(0, 200));
        
        // Check if it's actually base64 encoded
        if (encodedData && !encodedData.startsWith('<') && !encodedData.startsWith('{')) {
          const decodedData = decodeBase64(encodedData);
          if (decodedData) {
            console.log('AVL Data decoded successfully:', decodedData);
            return decodedData;
          }
        } else {
          // Try parsing as direct JSON
          try {
            data = JSON.parse(encodedData);
            console.log('AVL Data parsed as JSON:', data);
            return data;
          } catch (parseError) {
            console.warn('Failed to parse response as JSON:', parseError);
          }
        }
      }
      
      // If we get here, something went wrong
      console.warn('Unable to process AVL data response, using mock data');
      throw new Error('Invalid response format');
      
    } catch (error) {
      console.error('Failed to fetch AVL data, using mock data:', error);
      // Return mock AVL data for development
      return {
        cmd_name: "GetAvlData",
        status: "OK",
        result: [
          {
            idx: 0,
            vehicle_id: "V247",
            driver_id: "TVAN", 
            segment_id: "ROUTE 01 Weekday",
            avl_data: [{
              id: 0,
              vehicle_id: "V247",
              latitude: 42.3601,
              longitude: -71.0589,
              speed: 25,
              heading: 180,
              timestamp: new Date().toISOString()
            }]
          },
          {
            idx: 1,
            vehicle_id: "V241",
            driver_id: "ZREM",
            segment_id: "ROUTE 02 Weekday", 
            avl_data: [{
              id: 1,
              vehicle_id: "V241",
              latitude: 42.3651,
              longitude: -71.0639,
              speed: 30,
              heading: 90,
              timestamp: new Date().toISOString()
            }]
          }
        ]
      };
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
    try {
      const response = await fetchWithCORS(`${BASE_URL}/GetRoutePolyline?data=ALL`);
      const data = await response.json();
      
      if (data?.status === 'OK' && data.result) {
        return {
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
      }
      
      return {
        status: 'OK',
        routes: []
      };
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
    try {
      const response = await fetchWithCORS(`${BASE_URL}/GetRoutePolyline?data=ALL`);
      const data = await response.json();
      
      console.log('Raw polyline API response:', data);
      
      if (data?.status === 'OK' && data.result && Array.isArray(data.result)) {
        // Return the data in the format expected by the polyline utilities
        return {
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
      }
      
      console.warn('Invalid polyline response structure:', data);
      return {
        cmd_name: "GetRoutePolyline",
        status: "OK",
        result: []
      };
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
  vehicle_id: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  timestamp: string;
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