# Polyline Data Structure Implementation

This implementation provides comprehensive support for rendering polylines on the map using a GeoJSON-like data structure with styling information.

## Data Structure

Your polyline data follows this structure:

```json
{
  "cmd_name": "GetRoutePolyline",
  "status": "OK",
  "result": [
    {
      "idx": 0,
      "segment_id": "ROUTE 01 Pinny",
      "polyline_latlng": {
        "features": [
          {
            "geometry": {
              "type": "LineString",
              "coordinates": [
                [longitude, latitude],
                [longitude, latitude],
                // ... more coordinate pairs
              ]
            },
            "properties": {
              "name": "M-13",
              "type": "Feature"
            }
          }
        ],
        "type": "FeatureCollection"
      },
      "polyline_style": {
        "color": "#1DEC22",
        "weight": 5,
        "opacity": 1
      }
    }
  ]
}
```

## Key Features

### 1. **GeoJSON Compatibility**
- Coordinates in `[longitude, latitude]` format (standard GeoJSON)
- Automatic conversion to Leaflet's `[latitude, longitude]` format
- Support for LineString geometry type

### 2. **Style Properties**
- `color`: Hex color code for the polyline
- `weight`: Line thickness (number)
- `opacity`: Transparency (0.0 to 1.0)

### 3. **Route Information**
- `segment_id`: Unique identifier for the route
- `name`: Display name from properties
- `idx`: Index for ordering

## Usage

### Basic Implementation

```typescript
import MapComponent from '@/components/Map';
import { PolylineResponse } from '@/lib/polylineUtils';

const MyComponent = () => {
  const polylineData: PolylineResponse = {
    // Your polyline data structure
  };

  return (
    <MapComponent
      selectedRoute={null}
      onVehicleSelect={(vehicleId) => console.log(vehicleId)}
      selectedRoutesForMap={[]} // Optional route filtering
      polylineData={polylineData} // New prop for polyline data
    />
  );
};
```

### Processing Functions

The implementation provides several utility functions:

#### `processGeoJSONPolyline(polylineData: PolylineData)`
Processes a single polyline data item and returns:
```typescript
{
  coordinates: [number, number][]; // [lat, lng] pairs for Leaflet
  style: PolylineStyle;            // Color, weight, opacity
  segmentId: string;               // Route identifier
  name: string;                    // Display name
}
```

#### `processMultiplePolylines(polylineResponse: PolylineResponse)`
Processes the entire response and returns an array of processed polylines.

### Map Component Enhancement

The `MapComponent` now supports:

1. **Automatic Style Application**: Uses colors, weights, and opacity from `polyline_style`
2. **Route Filtering**: Show only selected routes by passing `selectedRoutesForMap`
3. **Interactive Popups**: Click polylines to see route information with color indicators
4. **Auto-Fitting**: Map automatically adjusts bounds to show all polylines

### Example Polyline Popup

When you click a polyline, you'll see:
- Route name
- Segment ID
- Number of coordinate points
- Color indicator matching the polyline color

## Demo Component

Visit `/polyline-demo` to see the implementation in action. The demo includes:

- Interactive route selection
- Toggle between showing all routes vs. selected routes
- Sample data structure display
- Feature checklist

## Route Filtering

You can filter which polylines are displayed:

```typescript
// Show all polylines
<MapComponent polylineData={data} selectedRoutesForMap={[]} />

// Show only specific routes
const selectedRoutes = [
  { id: "ROUTE 01 Pinny", segment_id: "ROUTE 01 Pinny", ... }
];
<MapComponent 
  polylineData={data} 
  selectedRoutesForMap={selectedRoutes} 
/>
```

## Backward Compatibility

The implementation maintains backward compatibility with existing polyline processing:

- Legacy `processPolylineData()` function still works
- Existing API calls continue to function
- New functionality is additive, not breaking

## TypeScript Interfaces

```typescript
interface PolylineStyle {
  color: string;
  weight: number;
  opacity: number;
}

interface PolylineGeometry {
  type: string;
  coordinates: number[][];
}

interface PolylineFeature {
  geometry: PolylineGeometry;
  properties: {
    name: string;
    type: string;
  };
}

interface PolylineData {
  idx: number;
  segment_id: string;
  polyline_latlng: {
    features: PolylineFeature[];
    type: string;
  };
  polyline_style: PolylineStyle;
}

interface PolylineResponse {
  cmd_name: string;
  status: string;
  result: PolylineData[];
}
```

## Error Handling

The implementation includes comprehensive error handling:

- Invalid coordinate data
- Missing style properties (falls back to defaults)
- Malformed GeoJSON structure
- Network errors (graceful degradation)

## Performance Considerations

- Efficient coordinate transformation
- Minimal re-renders when data changes
- Lazy loading of polyline rendering
- Memory cleanup on component unmount

## Testing

Run the demo to test your polyline data:

1. Start the development server: `npm run dev`
2. Navigate to `/polyline-demo`
3. Use the sidebar controls to test route filtering
4. Inspect the console for processing logs
5. Click on polylines to verify popup information

## Migration from Legacy System

If you're migrating from the old polyline system:

1. Update your data structure to match the new format
2. Add the `polylineData` prop to your MapComponent usage
3. Remove direct API calls for polyline data
4. Test with the demo component first

The new system provides better performance, more styling options, and cleaner code organization.