export interface Stop {
  id: string;
  name: string;
  coordinates: [number, number];
  estimatedArrival?: string;
}

export interface Vehicle {
  id: string;
  name: string;
  coordinates: [number, number];
  status: 'active' | 'inactive' | 'maintenance';
}

export interface Route {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  duration: string;
  status: 'active' | 'completed' | 'pending';
  vehicles: Vehicle[];
  polyline: [number, number][];
  distance: string;
  stops: Stop[];
}

export const mockRoutes: Route[] = [
  {
    id: '1',
    name: 'Downtown Express',
    startTime: '08:00',
    endTime: '18:00',
    duration: '45 min',
    status: 'active',
    distance: '12.5 km',
    vehicles: [
      { id: 'v1', name: 'Bus 101', coordinates: [-74.006, 40.7128], status: 'active' },
      { id: 'v2', name: 'Bus 102', coordinates: [-74.010, 40.7180], status: 'active' }
    ],
    stops: [
      { id: 's1', name: 'City Hall', coordinates: [-74.006, 40.7128], estimatedArrival: '8:15 AM' },
      { id: 's2', name: 'Financial District', coordinates: [-74.009, 40.7150], estimatedArrival: '8:25 AM' },
      { id: 's3', name: 'Union Square', coordinates: [-74.012, 40.7170], estimatedArrival: '8:35 AM' },
      { id: 's4', name: 'Times Square', coordinates: [-74.015, 40.7190], estimatedArrival: '8:45 AM' },
      { id: 's5', name: 'Central Park', coordinates: [-74.018, 40.7210], estimatedArrival: '8:55 AM' }
    ],
    polyline: [
      [-74.006, 40.7128],
      [-74.009, 40.7150],
      [-74.012, 40.7170],
      [-74.015, 40.7190],
      [-74.018, 40.7210]
    ]
  },
  {
    id: '2',
    name: 'Airport Shuttle',
    startTime: '06:00',
    endTime: '22:00',
    duration: '35 min',
    status: 'active',
    distance: '18.2 km',
    vehicles: [
      { id: 'v3', name: 'Shuttle A1', coordinates: [-74.020, 40.7250], status: 'active' }
    ],
    stops: [
      { id: 's6', name: 'Terminal 1', coordinates: [-74.020, 40.7250], estimatedArrival: '6:30 AM' },
      { id: 's7', name: 'Terminal 2', coordinates: [-74.025, 40.7280], estimatedArrival: '6:40 AM' },
      { id: 's8', name: 'Hotel District', coordinates: [-74.030, 40.7310], estimatedArrival: '6:50 AM' },
      { id: 's9', name: 'Metro Center', coordinates: [-74.035, 40.7340], estimatedArrival: '7:00 AM' }
    ],
    polyline: [
      [-74.020, 40.7250],
      [-74.025, 40.7280],
      [-74.030, 40.7310],
      [-74.035, 40.7340],
      [-74.040, 40.7370]
    ]
  },
  {
    id: '3',
    name: 'University Line',
    startTime: '07:30',
    endTime: '19:30',
    duration: '25 min',
    status: 'completed',
    distance: '8.7 km',
    vehicles: [
      { id: 'v4', name: 'Bus 201', coordinates: [-73.990, 40.7400], status: 'inactive' },
      { id: 'v5', name: 'Bus 202', coordinates: [-73.985, 40.7420], status: 'maintenance' }
    ],
    stops: [
      { id: 's10', name: 'University Gate', coordinates: [-73.990, 40.7400] },
      { id: 's11', name: 'Library', coordinates: [-73.985, 40.7420] },
      { id: 's12', name: 'Student Center', coordinates: [-73.980, 40.7440] }
    ],
    polyline: [
      [-73.990, 40.7400],
      [-73.985, 40.7420],
      [-73.980, 40.7440],
      [-73.975, 40.7460],
      [-73.970, 40.7480]
    ]
  },
  {
    id: '4',
    name: 'Coastal Highway',
    startTime: '09:00',
    endTime: '17:00',
    duration: '55 min',
    status: 'active',
    distance: '25.3 km',
    vehicles: [
      { id: 'v6', name: 'Express 301', coordinates: [-74.050, 40.7500], status: 'active' }
    ],
    stops: [
      { id: 's13', name: 'Beach Front', coordinates: [-74.050, 40.7500], estimatedArrival: '9:15 AM' },
      { id: 's14', name: 'Pier 39', coordinates: [-74.055, 40.7520], estimatedArrival: '9:30 AM' },
      { id: 's15', name: 'Marina', coordinates: [-74.060, 40.7540], estimatedArrival: '9:45 AM' }
    ],
    polyline: [
      [-74.050, 40.7500],
      [-74.055, 40.7520],
      [-74.060, 40.7540],
      [-74.065, 40.7560],
      [-74.070, 40.7580]
    ]
  },
  {
    id: '5',
    name: 'Business District',
    startTime: '07:00',
    endTime: '20:00',
    duration: '30 min',
    status: 'active',
    distance: '14.1 km',
    vehicles: [
      { id: 'v7', name: 'Metro 401', coordinates: [-73.950, 40.7600], status: 'active' },
      { id: 'v8', name: 'Metro 402', coordinates: [-73.945, 40.7620], status: 'active' }
    ],
    stops: [
      { id: 's16', name: 'Business Plaza', coordinates: [-73.950, 40.7600], estimatedArrival: '7:20 AM' },
      { id: 's17', name: 'Corporate Center', coordinates: [-73.945, 40.7620], estimatedArrival: '7:35 AM' },
      { id: 's18', name: 'Trade Center', coordinates: [-73.940, 40.7640], estimatedArrival: '7:50 AM' }
    ],
    polyline: [
      [-73.950, 40.7600],
      [-73.945, 40.7620],
      [-73.940, 40.7640],
      [-73.935, 40.7660],
      [-73.930, 40.7680]
    ]
  },
  {
    id: '6',
    name: 'Suburban Connect',
    startTime: '08:30',
    endTime: '16:30',
    duration: '40 min',
    status: 'pending',
    distance: '19.8 km',
    vehicles: [
      { id: 'v9', name: 'Local 501', coordinates: [-74.080, 40.7700], status: 'inactive' }
    ],
    stops: [
      { id: 's19', name: 'Suburb Mall', coordinates: [-74.080, 40.7700] },
      { id: 's20', name: 'Community Center', coordinates: [-74.085, 40.7720] }
    ],
    polyline: [
      [-74.080, 40.7700],
      [-74.085, 40.7720],
      [-74.090, 40.7740],
      [-74.095, 40.7760],
      [-74.100, 40.7780]
    ]
  },
  {
    id: '7',
    name: 'Night Owl Express',
    startTime: '22:00',
    endTime: '05:00',
    duration: '50 min',
    status: 'completed',
    distance: '22.4 km',
    vehicles: [
      { id: 'v10', name: 'Night 601', coordinates: [-73.920, 40.7800], status: 'inactive' }
    ],
    stops: [
      { id: 's21', name: 'Night District', coordinates: [-73.920, 40.7800] },
      { id: 's22', name: 'Late Club', coordinates: [-73.915, 40.7820] }
    ],
    polyline: [
      [-73.920, 40.7800],
      [-73.915, 40.7820],
      [-73.910, 40.7840],
      [-73.905, 40.7860],
      [-73.900, 40.7880]
    ]
  },
  {
    id: '8',
    name: 'Green Line',
    startTime: '06:30',
    endTime: '21:30',
    duration: '20 min',
    status: 'active',
    distance: '9.6 km',
    vehicles: [
      { id: 'v11', name: 'Eco 701', coordinates: [-74.110, 40.7900], status: 'active' },
      { id: 'v12', name: 'Eco 702', coordinates: [-74.115, 40.7920], status: 'active' }
    ],
    stops: [
      { id: 's23', name: 'Green Park', coordinates: [-74.110, 40.7900], estimatedArrival: '6:45 AM' },
      { id: 's24', name: 'Eco Center', coordinates: [-74.115, 40.7920], estimatedArrival: '7:00 AM' }
    ],
    polyline: [
      [-74.110, 40.7900],
      [-74.115, 40.7920],
      [-74.120, 40.7940],
      [-74.125, 40.7960],
      [-74.130, 40.7980]
    ]
  },
  {
    id: '9',
    name: 'Industrial Park',
    startTime: '05:30',
    endTime: '23:30',
    duration: '65 min',
    status: 'active',
    distance: '31.2 km',
    vehicles: [
      { id: 'v13', name: 'Heavy 801', coordinates: [-73.880, 40.8000], status: 'active' }
    ],
    stops: [
      { id: 's25', name: 'Factory Gate', coordinates: [-73.880, 40.8000], estimatedArrival: '5:45 AM' },
      { id: 's26', name: 'Warehouse District', coordinates: [-73.875, 40.8020], estimatedArrival: '6:15 AM' }
    ],
    polyline: [
      [-73.880, 40.8000],
      [-73.875, 40.8020],
      [-73.870, 40.8040],
      [-73.865, 40.8060],
      [-73.860, 40.8080]
    ]
  },
  {
    id: '10',
    name: 'Tourist Circuit',
    startTime: '10:00',
    endTime: '16:00',
    duration: '90 min',
    status: 'pending',
    distance: '42.7 km',
    vehicles: [
      { id: 'v14', name: 'Tour 901', coordinates: [-74.140, 40.8100], status: 'maintenance' },
      { id: 'v15', name: 'Tour 902', coordinates: [-74.145, 40.8120], status: 'inactive' }
    ],
    stops: [
      { id: 's27', name: 'Tourist Info', coordinates: [-74.140, 40.8100] },
      { id: 's28', name: 'Museum Quarter', coordinates: [-74.145, 40.8120] },
      { id: 's29', name: 'Historic Center', coordinates: [-74.150, 40.8140] }
    ],
    polyline: [
      [-74.140, 40.8100],
      [-74.145, 40.8120],
      [-74.150, 40.8140],
      [-74.155, 40.8160],
      [-74.160, 40.8180]
    ]
  }
];