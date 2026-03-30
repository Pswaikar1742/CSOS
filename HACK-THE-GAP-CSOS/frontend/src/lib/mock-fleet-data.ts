/** Mock data for sanitation fleet — trucks, workers, complaints. */

export interface SanitationTruck {
  id: string;
  name: string;
  route: string;
  ward: string;
  binsCollected: number;
  totalBins: number;
  driver: string;
  phone: string;
  status: 'active' | 'stopped' | 'idle' | 'offline';
  lat: number;
  lng: number;
  lastUpdate: string;
}

export interface CitizenComplaint {
  id: string;
  type: string;
  location: string;
  reportedBy: string;
  reportedAt: string;
  assignedTruck: string;
  eta: string;
  status: 'registered' | 'assigned' | 'resolved';
  priority: 'high' | 'medium' | 'low';
}

export const MOCK_TRUCKS: SanitationTruck[] = [
  { id: 'SWM-405', name: 'Ghanta Gaadi 405', route: 'Route A', ward: 'Ward 3-A', binsCollected: 45, totalBins: 60, driver: 'Ramesh Kumar', phone: '+91-9876543210', status: 'active', lat: 19.8820, lng: 75.3210, lastUpdate: '2 mins ago' },
  { id: 'SWM-202', name: 'Ghanta Gaadi 202', route: 'Route B', ward: 'Ward 5-B', binsCollected: 28, totalBins: 55, driver: 'Suresh Jadhav', phone: '+91-9876543211', status: 'active', lat: 19.8762, lng: 75.3433, lastUpdate: '5 mins ago' },
  { id: 'SWM-311', name: 'Compactor 311', route: 'Route C', ward: 'Ward 8-C', binsCollected: 52, totalBins: 52, driver: 'Vikram Patil', phone: '+91-9876543212', status: 'stopped', lat: 19.8700, lng: 75.3300, lastUpdate: '8 mins ago' },
  { id: 'SWM-118', name: 'Ghanta Gaadi 118', route: 'Route D', ward: 'Ward 12-D', binsCollected: 10, totalBins: 50, driver: 'Ganesh More', phone: '+91-9876543213', status: 'idle', lat: 19.8860, lng: 75.3350, lastUpdate: '22 mins ago' },
  { id: 'SWM-504', name: 'Compactor 504', route: 'Route E', ward: 'Ward 17-E', binsCollected: 0, totalBins: 45, driver: 'Pramod Wagh', phone: '+91-9876543214', status: 'offline', lat: 19.8790, lng: 75.3460, lastUpdate: '45 mins ago' },
  { id: 'SWM-607', name: 'Ghanta Gaadi 607', route: 'Route F', ward: 'Ward 22-F', binsCollected: 38, totalBins: 48, driver: 'Sanjay Kale', phone: '+91-9876543215', status: 'active', lat: 19.8840, lng: 75.3400, lastUpdate: '3 mins ago' },
];

export const MOCK_COMPLAINTS: CitizenComplaint[] = [
  { id: 'CMP-2453', type: 'Overflowing Bin', location: 'MG Road, Sector 12', reportedBy: 'Citizen via App', reportedAt: '10:15 AM', assignedTruck: 'SWM-405', eta: '25 mins', status: 'assigned', priority: 'high' },
  { id: 'CMP-2454', type: 'Illegal Dumping', location: 'CIDCO N-6 Intersection', reportedBy: 'WhatsApp Report', reportedAt: '10:30 AM', assignedTruck: 'SWM-202', eta: '15 mins', status: 'assigned', priority: 'high' },
  { id: 'CMP-2455', type: 'Missed Collection', location: 'Garkheda Colony', reportedBy: 'Phone Call', reportedAt: '09:45 AM', assignedTruck: 'SWM-311', eta: 'Completed', status: 'resolved', priority: 'medium' },
  { id: 'CMP-2456', type: 'Dead Animal', location: 'Beed Bypass Service Road', reportedBy: 'Citizen via App', reportedAt: '11:00 AM', assignedTruck: '', eta: 'Pending', status: 'registered', priority: 'medium' },
];

export const FLEET_SUMMARY = {
  wasteCollected: '124 Tons',
  routesCompleted: '45/50',
  workersPresent: '387/400',
  complaintsToday: '12 (8 resolved)',
};
