const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all requests
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Add request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'CORS Proxy Server is running' });
});

// Proxy middleware configuration
const proxyOptions = {
  target: 'https://tracker_baym.hbssweb.com',
  changeOrigin: true,
  pathRewrite: {
    '^/api': '', // Remove /api prefix when forwarding to target
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`Proxying: ${req.method} ${req.url} -> ${proxyReq.getHeader('host')}${proxyReq.path}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`Response: ${proxyRes.statusCode} for ${req.url}`);
  },
  onError: (err, req, res) => {
    console.error(`Proxy Error for ${req.url}:`, err.message);
    res.status(500).json({
      error: 'Proxy Error',
      message: err.message,
      url: req.url
    });
  }
};

// Create proxy middleware
const proxy = createProxyMiddleware(proxyOptions);

// Apply proxy to /api routes
app.use('/api', proxy);

// Catch-all for direct proxying (without /api prefix)
app.use('/', (req, res, next) => {
  if (req.path.startsWith('/health')) {
    return next();
  }
  return proxy(req, res, next);
});

app.listen(PORT, () => {
  console.log(`🚀 CORS Proxy Server running on http://localhost:${PORT}`);
  console.log('📡 Proxying requests to: https://tracker_baym.hbssweb.com');
  console.log('');
  console.log('Usage examples:');
  console.log(`  Direct: http://localhost:${PORT}/GetAllRoutes`);
  console.log(`  With prefix: http://localhost:${PORT}/api/GetAllRoutes`);
  console.log('');
  console.log('💡 Update your app to use this proxy server instead of the direct API calls');
  console.log(`   Change BASE_URL from 'https://tracker_baym.hbssweb.com' to 'http://localhost:${PORT}'`);
});

module.exports = app;