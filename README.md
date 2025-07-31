# Bus Tracker Application

A real-time bus tracking application built with React, TypeScript, and Leaflet. This application provides live vehicle tracking, route visualization, and stop information.

## 🚨 CORS Issue Resolution

### The Problem
The application connects to `https://tracker_baym.hbssweb.com` but encounters CORS (Cross-Origin Resource Sharing) errors:

```
Access to fetch at 'https://tracker_baym.hbssweb.com/GetStopsData?data=ROUTE%2002' 
from origin 'http://localhost:8080' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

### Solutions Implemented

#### 1. **Automatic CORS Proxy Fallback** ✅
The application automatically tries multiple CORS proxy services:
- Direct API call (first attempt)
- `cors-anywhere.herokuapp.com` (fallback 1)
- `api.allorigins.win` (fallback 2) 
- `corsproxy.io` (fallback 3)

#### 2. **Local CORS Proxy Server** ✅ (Recommended)
Run a local proxy server to bypass CORS restrictions entirely:

```bash
# Start the proxy server
npm run dev:proxy

# Or start both app and proxy together
npm run dev:all
```

Then update the `BASE_URL` in `src/services/apiService.ts`:
```typescript
const BASE_URL = 'http://localhost:3001'; // Instead of 'https://tracker_baym.hbssweb.com'
```

#### 3. **Intelligent Caching & Rate Limiting** ✅
- Routes data: cached for 5 minutes
- Stops data: cached for 10 minutes  
- Polylines: cached for 15 minutes
- AVL data: always fresh (no cache)
- API call rate limiting to prevent overwhelming the server

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd bus-tracker
npm install
```

2. **Choose your setup method:**

**Option A: Using Local Proxy (Recommended)**
```bash
# Terminal 1: Start the CORS proxy server
npm run dev:proxy

# Terminal 2: Start the React app  
npm run dev:app

# Or run both together:
npm run dev:all
```

**Option B: Using Built-in CORS Proxies**
```bash
# Just start the React app (uses automatic fallback proxies)
npm run dev
```

3. **Open your browser:**
```
http://localhost:8080  # React app
http://localhost:3001  # CORS proxy server (if using Option A)
```

## 🔧 Configuration

### API Endpoints
The application connects to these endpoints:
- `/GetAllRoutes` - Route information
- `/GetStopsData?data={route}` - Stop data for routes
- `/GetRoutePolyline?data=ALL` - Route polylines/paths
- `/GetAvlData?data=ALL` - Real-time vehicle locations

### Environment Variables
Create a `.env` file for custom configuration:
```env
VITE_API_BASE_URL=https://tracker_baym.hbssweb.com
VITE_PROXY_PORT=3001
VITE_UPDATE_INTERVAL=5000
```

## 🎯 Features

### ✅ Fixed Issues
- **CORS errors resolved** with multiple fallback strategies
- **Excessive API calls prevented** with intelligent caching
- **Polyline flickering eliminated** with change detection
- **Rate limiting implemented** (AVL data: every 5 seconds, other data: cached)
- **User-friendly error notifications** with status indicators

### 🗺️ Map Features
- Real-time vehicle tracking with animated markers
- Route polylines with custom colors
- Stop markers with ETA information
- Smooth vehicle position transitions
- Interactive popups with vehicle/stop details

### 📊 Data Management
- Automatic data refresh for real-time updates
- Efficient caching to reduce server load
- Error handling with graceful fallbacks
- Connection status indicators

## 🔄 Data Flow

1. **Initial Load:** Fetch routes and polylines (cached)
2. **Route Selection:** Load stops for selected routes (cached)
3. **Real-time Updates:** AVL data fetched every 5 seconds (no cache)
4. **Error Handling:** Automatic retry with different proxy services

## 🛠️ Development

### Project Structure
```
src/
├── components/
│   ├── Map.tsx              # Main map component
│   └── ui/                  # UI components
├── services/
│   └── apiService.ts        # API calls with CORS handling
├── lib/
│   └── polylineUtils.ts     # Polyline processing utilities
└── types/                   # TypeScript definitions
```

### Key Files
- `cors-proxy-server.js` - Local CORS proxy server
- `src/services/apiService.ts` - API service with CORS fallbacks
- `src/components/Map.tsx` - Map component with optimized rendering

### Scripts
```bash
npm run dev          # Start React app only
npm run dev:proxy    # Start CORS proxy only  
npm run dev:all      # Start both app and proxy
npm run build        # Build for production
npm run proxy        # Run proxy server only
```

## 🐛 Troubleshooting

### CORS Errors Persist
1. Try the local proxy server: `npm run dev:proxy`
2. Update `BASE_URL` to `http://localhost:3001`
3. Check if public CORS proxies are down
4. Verify network connectivity

### Polylines Not Showing
1. Check browser console for API errors
2. Verify route data is being fetched
3. Check if polyline coordinates are valid
4. Clear browser cache and reload

### Performance Issues
1. Check if caching is working (console logs)
2. Monitor network tab for excessive requests
3. Reduce update interval if needed
4. Ensure rate limiting is active

## 📱 Browser Compatibility
- Chrome 80+
- Firefox 75+ 
- Safari 13+
- Edge 80+

## 🤝 Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with both proxy configurations
5. Submit a pull request

## 📄 License
MIT License - see LICENSE file for details

---

**Need Help?** Check the browser console for detailed error messages and logs.
