import React, { useState, useEffect } from 'react';
import MapComponent from './Map';
import { ApiRoute, apiService } from '@/services/apiService';
import { PolylineResponse } from '@/lib/polylineUtils';

/**
 * Demo component that fetches polyline data from API and shows routes with checkboxes
 */
const PolylineAPIDemo: React.FC = () => {
  const [polylineData, setPolylineData] = useState<PolylineResponse | undefined>();
  const [availableRoutes, setAvailableRoutes] = useState<ApiRoute[]>([]);
  const [selectedRoutes, setSelectedRoutes] = useState<ApiRoute[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch polyline data from API
  const fetchPolylineData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching polyline data from API...');
      const data = await apiService.getGeoJSONPolylines();
      
      console.log('Received polyline data:', data);
      setPolylineData(data);
      
      // Create route objects from the polyline data
      if (data.result && Array.isArray(data.result)) {
        const routes: ApiRoute[] = data.result.map((item: any) => ({
          id: item.segment_id,
          name: item.segment_id,
          segment_id: item.segment_id,
          status: 'active',
          startTime: '06:00',
          endTime: '22:00'
        }));
        
        console.log('Created routes from polyline data:', routes);
        setAvailableRoutes(routes);
      }
    } catch (err) {
      console.error('Error fetching polyline data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch polyline data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchPolylineData();
  }, []);

  // Handle route checkbox toggle
  const handleRouteToggle = (route: ApiRoute) => {
    setSelectedRoutes(prev => {
      const isSelected = prev.some(r => r.id === route.id);
      if (isSelected) {
        const newSelection = prev.filter(r => r.id !== route.id);
        console.log('Deselected route:', route.name, 'New selection:', newSelection.map(r => r.name));
        return newSelection;
      } else {
        const newSelection = [...prev, route];
        console.log('Selected route:', route.name, 'New selection:', newSelection.map(r => r.name));
        return newSelection;
      }
    });
  };

  // Select all routes
  const selectAllRoutes = () => {
    setSelectedRoutes(availableRoutes);
    console.log('Selected all routes:', availableRoutes.map(r => r.name));
  };

  // Clear all selections
  const clearAllSelections = () => {
    setSelectedRoutes([]);
    console.log('Cleared all route selections');
  };

  const handleVehicleSelect = (vehicleId: string) => {
    console.log('Selected vehicle:', vehicleId);
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar with controls */}
      <div className="w-80 bg-white border-r border-gray-200 p-4 overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">API Polyline Demo</h2>
        
        {/* Fetch controls */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <h3 className="text-md font-medium mb-2">API Data</h3>
          <button
            onClick={fetchPolylineData}
            disabled={loading}
            className="w-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Fetching...' : 'Refresh Polyline Data'}
          </button>
          
          {error && (
            <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
              Error: {error}
            </div>
          )}
          
          {polylineData && (
            <div className="mt-2 text-sm text-green-700">
              ✅ Loaded {polylineData.result?.length || 0} routes from API
            </div>
          )}
        </div>

        {/* Route selection controls */}
        {availableRoutes.length > 0 && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-md font-medium">Route Selection</h3>
              <div className="space-x-2">
                <button
                  onClick={selectAllRoutes}
                  className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                >
                  All
                </button>
                <button
                  onClick={clearAllSelections}
                  className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Clear
                </button>
              </div>
            </div>
            
            <div className="text-sm text-gray-600 mb-2">
              {selectedRoutes.length} of {availableRoutes.length} routes selected
            </div>

            {/* Route checkboxes */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {availableRoutes.map((route, index) => (
                <label key={route.id} className="flex items-center p-2 rounded hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedRoutes.some(r => r.id === route.id)}
                    onChange={() => handleRouteToggle(route)}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{route.name}</div>
                    <div className="text-xs text-gray-500">ID: {route.segment_id}</div>
                  </div>
                  {/* Color indicator from polyline data */}
                  {polylineData?.result?.[index]?.polyline_style?.color && (
                    <div 
                      className="w-4 h-4 rounded border border-gray-300 ml-2"
                      style={{ 
                        backgroundColor: polylineData.result[index].polyline_style.color 
                      }}
                    />
                  )}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Debug info */}
        <div className="border-t pt-4">
          <h3 className="text-md font-medium mb-2">Debug Info</h3>
          <div className="text-xs bg-gray-50 p-2 rounded space-y-1">
            <div>API Status: {polylineData?.status || 'Not fetched'}</div>
            <div>Available Routes: {availableRoutes.length}</div>
            <div>Selected Routes: {selectedRoutes.length}</div>
            <div>Polyline Data: {polylineData ? 'Loaded' : 'None'}</div>
          </div>
          
          {polylineData && (
            <details className="mt-2">
              <summary className="text-xs cursor-pointer hover:text-blue-600">
                Raw API Response (click to expand)
              </summary>
              <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto max-h-40">
                {JSON.stringify(polylineData, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1">
        {polylineData ? (
          <MapComponent
            selectedRoute={null}
            onVehicleSelect={handleVehicleSelect}
            selectedRoutesForMap={selectedRoutes}
            polylineData={polylineData}
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <div className="text-lg font-medium text-gray-600 mb-2">
                {loading ? 'Loading polyline data...' : 'No polyline data'}
              </div>
              <div className="text-sm text-gray-500">
                {loading ? 'Fetching from API...' : 'Click "Refresh Polyline Data" to load routes'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PolylineAPIDemo;