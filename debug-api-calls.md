# Debug: API Call Analysis

## Current Issues Reported
- Polyline API (`GetRoutePolyline`) called repeatedly 
- Stops data API (`GetStopsData`) called repeatedly

## Root Causes Identified

### 1. **Polyline API Repeated Calls** ✅ FIXED
**Problem**: Map component was making API calls in `drawRoutePaths()` even when `polylineData` prop should be used
**Solution**: 
- Centralized polyline fetching in RouteTracker 
- Modified Map component to prioritize `polylineData` prop
- Added fallback warnings when API calls are made from Map

### 2. **Stops Data API Repeated Calls** 
**Potential Causes**:
1. **Double Caching**: Both apiService and Map component have their own caching
2. **Dialog Re-renders**: RoutesList dialog might be re-fetching on each open
3. **Effect Dependencies**: useEffect dependencies might be causing re-runs

### 3. **Caching Conflicts**
- `apiService` has global cache with TTL
- Map component has `routeStopsCacheRef` local cache
- These might be working against each other

## Monitoring Points

### Console Logs to Watch:
```
- "Cache hit for: GetStopsData:ROUTE_NAME" (good)
- "Fetching stops for N routes not in cache" (should be minimal)
- "Rate limiting: Skipping polyline update" (good)
- "WARNING: Making API calls from Map component" (bad - should not appear)
```

### Network Tab Check:
Monitor these endpoints in browser dev tools:
- `GetRoutePolyline?data=ALL` - should only be called once per session
- `GetStopsData?data=ROUTE_NAME` - should be cached for 10 minutes per route

## Expected Behavior After Fixes:
1. **Polylines**: Fetched once in RouteTracker, passed to Map
2. **Stops**: Cached for 10 minutes per route, shared between RoutesList and Map
3. **AVL Data**: Only endpoint that should refresh every 5 seconds