import React from 'react';
import RouteTracker from './RouteTracker.tsx';

// Embed version without authentication
const EmbedTracker: React.FC = () => {
  console.log('EmbedTracker rendering');
  return <RouteTracker />;
};

export default EmbedTracker;