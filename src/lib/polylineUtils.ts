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

/**
 * Process polyline data - decode if encoded, return coordinates if already decoded
 */
export function processPolylineData(data: any): [number, number][] {
  // If it's already an array of coordinates
  if (Array.isArray(data)) {
    return data.map((coord: any) => {
      // Handle different coordinate formats
      if (Array.isArray(coord)) {
        // GeoJSON format: [longitude, latitude] -> [latitude, longitude]
        if (coord.length >= 2) {
          const [lng, lat] = coord;
          return [parseFloat(lat), parseFloat(lng)];
        }
      } else if (typeof coord === 'object') {
        // Object format: {lat, lng} or {latitude, longitude}
        return [
          parseFloat(coord.lat || coord.latitude),
          parseFloat(coord.lng || coord.longitude)
        ];
      }
      return [0, 0]; // fallback
    });
  }
  
  // If it's an encoded polyline string
  if (typeof data === 'string' && isEncodedPolyline(data)) {
    return decodePolyline(data);
  }
  
  return [];
}