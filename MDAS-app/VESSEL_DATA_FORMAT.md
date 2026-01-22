# Vessel Data Format Specification

Based on the SQL database structure (`simrad_lines` and `simrad_packets` tables), the server should process radar scan data and send vessel information in the following format.

## Expected Server Response Format

The server should send vessel data as a JSON array or object containing an array of vessels. Each vessel object should follow this structure:

### JSON Format

```json
{
  "vessels": [
    {
      "id": 1,
      "callsign": "SHIP-001",
      "mmsi": "123456789",
      "x": 2000.0,
      "y": 1500.0,
      "speed": 10.5,
      "heading": 45.0,
      "course": 45.0,
      "timestamp": "2025-01-16T12:00:00Z"
    }
  ]
}
```

OR as a direct array:

```json
[
  {
    "id": 1,
    "callsign": "SHIP-001",
    "x": 2000.0,
    "y": 1500.0,
    "speed": 10.5,
    "heading": 45.0
  }
]
```

## Field Specifications

### Required Fields
- **`id`** (number): Unique vessel identifier. Can be derived from tracking ID or MMSI.

### Position Fields (use one of the following)
- **Option 1: Cartesian coordinates (meters)**
  - `x` (number): X position in meters relative to own ship (positive = East/Starboard)
  - `y` (number): Y position in meters relative to own ship (positive = North/Ahead)

- **Option 2: Geographic coordinates**
  - `latitude` (number): Latitude in decimal degrees
  - `longitude` (number): Longitude in decimal degrees
  - Note: If using lat/lon, provide `ownShipLat` and `ownShipLon` props to Radar component for conversion

### Speed Fields (use one of the following)
- `speed` (number): Speed in **knots** (will be converted to m/s automatically)
- `speed_mps` (number): Speed in meters per second (if provided, used directly)

### Heading/Course Fields (use one of the following)
- `heading` (number): Heading in **degrees** (0-360, where 0° = North, 90° = East)
- `heading_rad` (number): Heading in radians (if provided, used directly)
- `course` (number): Course over ground in **degrees** (defaults to heading if not provided)
- `course_rad` (number): Course in radians (if provided, used directly)

### Identification Fields (optional)
- `callsign` (string): Vessel callsign (e.g., "SHIP-001", "WXYZ1234")
- `mmsi` (string): Maritime Mobile Service Identity number

### Metadata (optional)
- `timestamp` (string | number): Timestamp of the data (ISO 8601 string or Unix timestamp)

## Data Derived from SQL Structure

Based on the `simrad_lines` table structure:
- **angle** (double precision): Radar scan angle
- **range** (integer): Distance in meters
- **intensities** (integer[]): Radar return intensities
- **packet_id** (integer): Links to `simrad_packets` table
- **timestamp** (from simrad_packets): When the radar data was captured

The server should process this radar data to:
1. Detect vessel targets from intensity patterns
2. Track vessels across multiple scans
3. Calculate position (x, y) from angle and range
4. Calculate speed from position changes over time
5. Calculate heading/course from movement direction
6. Assign unique IDs to tracked vessels

## Example Server Response

```json
{
  "vessels": [
    {
      "id": 1001,
      "callsign": "TARGET-001",
      "x": 2500.5,
      "y": 1800.2,
      "speed": 12.5,
      "heading": 135.0,
      "course": 135.0,
      "timestamp": "2025-01-16T12:00:00Z"
    },
    {
      "id": 1002,
      "callsign": "TARGET-002",
      "x": -1200.0,
      "y": -800.5,
      "speed": 8.3,
      "heading": 270.0,
      "course": 270.0,
      "timestamp": "2025-01-16T12:00:00Z"
    }
  ]
}
```

## Using Latitude/Longitude

If your server provides geographic coordinates instead of relative positions:

```json
{
  "vessels": [
    {
      "id": 1001,
      "callsign": "TARGET-001",
      "latitude": 45.5017,
      "longitude": -73.5673,
      "speed": 12.5,
      "heading": 135.0
    }
  ]
}
```

Then use the Radar component with own ship position:

```tsx
<Radar 
  serverUrl="/api/vessels"
  ownShipLat={45.5}
  ownShipLon={-73.6}
/>
```

## TypeScript Interface

The TypeScript interface that matches this format:

```typescript
interface ServerVesselData {
  id: number;
  callsign?: string;
  mmsi?: string;
  x?: number;              // X position in meters
  y?: number;              // Y position in meters
  latitude?: number;        // Latitude in degrees
  longitude?: number;       // Longitude in degrees
  speed?: number;           // Speed in knots
  speed_mps?: number;       // Speed in m/s
  heading?: number;         // Heading in degrees
  heading_rad?: number;     // Heading in radians
  course?: number;          // Course in degrees
  course_rad?: number;      // Course in radians
  timestamp?: string | number;
}
```

## Conversion Notes

- **Speed**: 1 knot = 0.514444 m/s
- **Heading**: Degrees to radians = `degrees * (π / 180)`
- **Position**: If using lat/lon, conversion uses:
  - 1° latitude ≈ 111,320 meters
  - 1° longitude ≈ 111,320 * cos(latitude) meters
