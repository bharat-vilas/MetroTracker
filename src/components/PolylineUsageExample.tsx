import React from 'react';
import MapComponent from './Map';
import { PolylineResponse } from '@/lib/polylineUtils';

/**
 * Simple example showing how to use your exact polyline data structure
 * with the enhanced Map component
 */

const PolylineUsageExample: React.FC = () => {
  // This is how you would structure your actual polyline data
  // based on the JSON structure you provided
  const yourPolylineData: PolylineResponse = {
    cmd_name: "GetRoutePolyline",
    status: "OK",
    result: [
      {
        idx: 0,
        segment_id: "ROUTE 01 Pinny",
        polyline_latlng: {
          features: [
            {
              geometry: {
                type: "LineString",
                coordinates: [
                  // Replace these with your actual coordinates
                  // Format: [longitude, latitude]
                  [-71.0589, 42.3601],
                  [-71.0600, 42.3610],
                  [-71.0620, 42.3630],
                  [-71.0640, 42.3650],
                  [-71.0660, 42.3670]
                ]
              },
              properties: {
                name: "M-13",
                type: "Feature"
              }
            }
          ],
          type: "FeatureCollection"
        },
        polyline_style: {
          color: "#1DEC22",  // Your exact color
          weight: 5,
          opacity: 1
        }
      }
      // Add more routes here if you have multiple in your result array
    ]
  };

  // Handle vehicle selection (you can customize this)
  const handleVehicleSelect = (vehicleId: string) => {
    console.log('Selected vehicle:', vehicleId);
    // Add your vehicle selection logic here
  };

  return (
    <div className="w-full h-screen">
      <div className="p-4 bg-blue-50 border-b">
        <h1 className="text-xl font-semibold">Your Polyline Data Implementation</h1>
        <p className="text-sm text-gray-600 mt-1">
          This shows how to use your exact polyline data structure with the Map component
        </p>
      </div>
      
      <div className="h-full">
        <MapComponent
          selectedRoute={null}
          onVehicleSelect={handleVehicleSelect}
          selectedRoutesForMap={[]} // Empty array = show all polylines
          polylineData={yourPolylineData} // Pass your polyline data here
        />
      </div>
    </div>
  );
};

export default PolylineUsageExample;

/**
 * INTEGRATION STEPS:
 * 
 * 1. Replace the sample coordinates in `yourPolylineData.result[0].polyline_latlng.features[0].geometry.coordinates`
 *    with your actual route coordinates
 * 
 * 2. If you have multiple routes, add more objects to the `result` array:
 *    ```typescript
 *    result: [
 *      { // First route
 *        idx: 0,
 *        segment_id: "ROUTE 01 Pinny",
 *        polyline_latlng: { ... },
 *        polyline_style: { color: "#1DEC22", weight: 5, opacity: 1 }
 *      },
 *      { // Second route
 *        idx: 1,
 *        segment_id: "ROUTE 02 Another",
 *        polyline_latlng: { ... },
 *        polyline_style: { color: "#FF0000", weight: 4, opacity: 0.8 }
 *      }
 *    ]
 *    ```
 * 
 * 3. If you want to filter which routes are shown, pass specific routes to `selectedRoutesForMap`:
 *    ```typescript
 *    const routesToShow = [
 *      { id: "ROUTE 01 Pinny", segment_id: "ROUTE 01 Pinny", name: "M-13", status: "active" }
 *    ];
 *    
 *    <MapComponent 
 *      selectedRoutesForMap={routesToShow}
 *      polylineData={yourPolylineData}
 *      // ... other props
 *    />
 *    ```
 * 
 * 4. To fetch polyline data from your API instead of using static data:
 *    ```typescript
 *    const [polylineData, setPolylineData] = useState<PolylineResponse | undefined>();
 *    
 *    useEffect(() => {
 *      // Replace with your actual API call
 *      fetch('/api/GetRoutePolyline?data=ALL')
 *        .then(response => response.json())
 *        .then(data => setPolylineData(data));
 *    }, []);
 *    
 *    <MapComponent polylineData={polylineData} ... />
 *    ```
 */