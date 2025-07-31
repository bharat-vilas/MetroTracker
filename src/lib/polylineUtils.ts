/**
 * Decode Google's encoded polyline algorithm
 * Based on the algorithm documented here: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
export function decodePolyline(encoded: string, precision = 5): [number, number][] {
  if (!encoded) return [];
  
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  const factor = Math.pow(10, precision);

  while (index < encoded.length) {
    // Decode latitude
    let result = 1;
    let shift = 0;
    let b: number;
    
    do {
      b = encoded.charCodeAt(index++) - 63;
      result += (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    
    const deltaLat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += deltaLat;

    // Decode longitude
    result = 1;
    shift = 0;
    
    do {
      b = encoded.charCodeAt(index++) - 63;
      result += (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    
    const deltaLng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += deltaLng;

    points.push([lat / factor, lng / factor]);
  }

  return points;
}

/**
 * Check if a string is likely an encoded polyline
 */
export function isEncodedPolyline(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
  
  // Encoded polylines typically contain these characters
  const polylineChars = /^[a-zA-Z0-9_`~@\-\.]*$/;
  
  // Must be longer than a reasonable minimum and match the character set
  return str.length > 10 && polylineChars.test(str);
}

// Types for the new polyline data structure
export interface PolylineGeometry {
  type: string;
  coordinates: number[][];
}

export interface PolylineProperties {
  name: string;
  type: string;
}

export interface PolylineFeature {
  geometry: PolylineGeometry;
  properties: PolylineProperties;
}

export interface PolylineStyle {
  color: string;
  weight: number;
  opacity: number;
}

export interface PolylineData {
  idx: number;
  segment_id: string;
  polyline_latlng: {
    features: PolylineFeature[];
    type: string;
  };
  polyline_style: PolylineStyle;
}

export interface PolylineResponse {
  cmd_name: string;
  status: string;
  result: PolylineData[];
}

/**
 * Process polyline data from GeoJSON-like structure
 */
export function processGeoJSONPolyline(polylineData: PolylineData): {
  coordinates: [number, number][];
  style: PolylineStyle;
  segmentId: string;
  name: string;
} | null {
  try {
    if (!polylineData?.polyline_latlng?.features?.[0]?.geometry?.coordinates) {
      console.warn('Invalid polyline data structure:', polylineData);
      return null;
    }

    const feature = polylineData.polyline_latlng.features[0];
    const geometry = feature.geometry;
    
    // Handle LineString coordinates (array of [lng, lat] pairs)
    let coordinates: [number, number][] = [];
    
    if (geometry.type === 'LineString') {
      // GeoJSON format is [longitude, latitude], but Leaflet expects [latitude, longitude]
      coordinates = geometry.coordinates.map(coord => [coord[1], coord[0]] as [number, number]);
    } else {
      console.warn('Unsupported geometry type:', geometry.type);
      return null;
    }

    const style = polylineData.polyline_style || {
      color: '#3b82f6',
      weight: 5,
      opacity: 1
    };

    const name = feature.properties?.name || polylineData.segment_id || 'Unknown Route';

    return {
      coordinates,
      style,
      segmentId: polylineData.segment_id,
      name
    };
  } catch (error) {
    console.error('Error processing GeoJSON polyline:', error);
    return null;
  }
}

/**
 * Process multiple polyline data items
 */
export function processMultiplePolylines(polylineResponse: PolylineResponse): Array<{
  coordinates: [number, number][];
  style: PolylineStyle;
  segmentId: string;
  name: string;
}> {
  if (!polylineResponse?.result || !Array.isArray(polylineResponse.result)) {
    console.warn('Invalid polyline response:', polylineResponse);
    return [];
  }

  const processedPolylines: Array<{
    coordinates: [number, number][];
    style: PolylineStyle;
    segmentId: string;
    name: string;
  }> = [];

  polylineResponse.result.forEach((polylineData, index) => {
    const processed = processGeoJSONPolyline(polylineData);
    if (processed) {
      processedPolylines.push(processed);
    } else {
      console.warn(`Failed to process polyline at index ${index}:`, polylineData);
    }
  });

  return processedPolylines;
}

/**
 * Legacy function - process polyline data - decode if encoded, return coordinates if already decoded
 * Kept for backward compatibility
 */
export function processPolylineData(data: any): [number, number][] {
  // Handle new GeoJSON-like structure
  if (data && typeof data === 'object' && data.polyline_latlng) {
    const processed = processGeoJSONPolyline(data);
    return processed ? processed.coordinates : [];
  }

  // If it's already an array of coordinates
  if (Array.isArray(data)) {
    return data.map((coord: any) => [
      parseFloat(coord.lat || coord.latitude),
      parseFloat(coord.lng || coord.longitude)
    ]);
  }
  
  // If it's an encoded polyline string
  if (typeof data === 'string' && isEncodedPolyline(data)) {
    return decodePolyline(data);
  }
  
  return [];
}