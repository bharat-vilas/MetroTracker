import React, { useState } from 'react';
import MapComponent from './Map';
import { ApiRoute } from '@/services/apiService';
import { PolylineResponse } from '@/lib/polylineUtils';

// Sample polyline data based on your provided structure
const samplePolylineData: PolylineResponse = {
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
                [-71.0589, 42.3601], // Boston coordinates (longitude, latitude)
                [-71.0600, 42.3610],
                [-71.0620, 42.3630],
                [-71.0640, 42.3650],
                [-71.0660, 42.3670],
                [-71.0680, 42.3690],
                [-71.0700, 42.3710]
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
        color: "#1DEC22",
        weight: 5,
        opacity: 1
      }
    },
    {
      idx: 1,
      segment_id: "ROUTE 02 Downtown",
      polyline_latlng: {
        features: [
          {
            geometry: {
              type: "LineString",
              coordinates: [
                [-71.0700, 42.3710],
                [-71.0720, 42.3730],
                [-71.0740, 42.3750],
                [-71.0760, 42.3770],
                [-71.0780, 42.3790]
              ]
            },
            properties: {
              name: "Downtown Express",
              type: "Feature"
            }
          }
        ],
        type: "FeatureCollection"
      },
      polyline_style: {
        color: "#FF4444",
        weight: 6,
        opacity: 0.8
      }
    }
  ]
};

// Sample routes that match the polyline data
const sampleRoutes: ApiRoute[] = [
  {
    id: "ROUTE 01 Pinny",
    name: "M-13 Route",
    segment_id: "ROUTE 01 Pinny",
    status: "active",
    startTime: "06:00",
    endTime: "22:00"
  },
  {
    id: "ROUTE 02 Downtown", 
    name: "Downtown Express",
    segment_id: "ROUTE 02 Downtown",
    status: "active",
    startTime: "05:30",
    endTime: "23:30"
  }
];

const PolylineDemo: React.FC = () => {
  const [selectedRoutes, setSelectedRoutes] = useState<ApiRoute[]>([]);
  const [showAllRoutes, setShowAllRoutes] = useState(true);

  const handleRouteToggle = (route: ApiRoute) => {
    setSelectedRoutes(prev => {
      const isSelected = prev.some(r => r.id === route.id);
      if (isSelected) {
        return prev.filter(r => r.id !== route.id);
      } else {
        return [...prev, route];
      }
    });
  };

  const handleVehicleSelect = (vehicleId: string) => {
    console.log('Vehicle selected:', vehicleId);
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar with route controls */}
      <div className="w-80 bg-white border-r border-gray-200 p-4 overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Polyline Demo</h2>
        
        <div className="mb-4">
          <h3 className="text-md font-medium mb-2">Display Options</h3>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showAllRoutes}
              onChange={(e) => setShowAllRoutes(e.target.checked)}
              className="mr-2"
            />
            Show All Routes
          </label>
        </div>

        <div className="mb-4">
          <h3 className="text-md font-medium mb-2">Available Routes</h3>
          {sampleRoutes.map(route => (
            <div key={route.id} className="mb-2">
              <label className="flex items-center p-2 rounded hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selectedRoutes.some(r => r.id === route.id)}
                  onChange={() => handleRouteToggle(route)}
                  className="mr-2"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm">{route.name}</div>
                  <div className="text-xs text-gray-500">ID: {route.segment_id}</div>
                  <div className="text-xs text-gray-500">
                    {route.startTime} - {route.endTime}
                  </div>
                </div>
              </label>
            </div>
          ))}
        </div>

        <div className="border-t pt-4">
          <h3 className="text-md font-medium mb-2">Polyline Data Structure</h3>
          <div className="text-xs bg-gray-50 p-2 rounded">
            <pre className="whitespace-pre-wrap">
{`{
  "cmd_name": "GetRoutePolyline",
  "status": "OK", 
  "result": [
    {
      "idx": 0,
      "segment_id": "ROUTE 01 Pinny",
      "polyline_latlng": {
        "features": [{
          "geometry": {
            "type": "LineString",
            "coordinates": [[lng, lat], ...]
          },
          "properties": {
            "name": "M-13",
            "type": "Feature"
          }
        }],
        "type": "FeatureCollection"
      },
      "polyline_style": {
        "color": "#1DEC22",
        "weight": 5,
        "opacity": 1
      }
    }
  ]
}`}
            </pre>
          </div>
        </div>

        <div className="border-t pt-4 mt-4">
          <h3 className="text-md font-medium mb-2">Features</h3>
          <ul className="text-sm space-y-1">
            <li>✅ GeoJSON coordinate handling</li>
            <li>✅ Style properties from polyline_style</li>
            <li>✅ Route filtering and selection</li>
            <li>✅ Automatic map bounds fitting</li>
            <li>✅ Popup with route information</li>
            <li>✅ Color indicators in popups</li>
          </ul>
        </div>
      </div>

      {/* Map component */}
      <div className="flex-1">
        <MapComponent
          selectedRoute={null}
          onVehicleSelect={handleVehicleSelect}
          selectedRoutesForMap={showAllRoutes ? [] : selectedRoutes}
          polylineData={samplePolylineData}
        />
      </div>
    </div>
  );
};

export default PolylineDemo;