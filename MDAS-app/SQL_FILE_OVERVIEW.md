# SQL Database Backup File Overview

## File Information
- **Filename**: `db_backup_2025-07-16.sql`
- **Type**: PostgreSQL database dump
- **Database Version**: PostgreSQL 17.5
- **Dump Tool**: pg_dump version 17.5
- **Size**: ~279,355 lines (very large file)
- **Date**: July 16, 2025 (based on filename)

## Purpose

This SQL file is a **complete database backup** of the MDAS (Maritime Domain Awareness System) backend database. It contains:

1. **Database schema** (table structures, sequences, constraints)
2. **All table data** (actual records from the database)
3. **Metadata** (ownership, permissions, etc.)

## Database Tables

The database contains **8 main tables**:

### 1. **contact_data**
- **Purpose**: Stores contact form submissions from users
- **Fields**: 
  - `id` (primary key)
  - `first_name`, `last_name`
  - `email`
  - `position`, `organization`
  - `feedback` (text)
  - `date` (timestamp)

### 2. **feedback**
- **Purpose**: Stores user feedback submissions
- **Fields**: Similar to `contact_data` (first_name, last_name, email, position, organization, feedback, date)

### 3. **organizations**
- **Purpose**: Manages organization/company information
- **Fields**:
  - `organization_id` (primary key)
  - `name`

### 4. **reset_tokens**
- **Purpose**: Stores password reset tokens for user authentication
- **Fields**:
  - `id` (primary key)
  - `token`
  - `user_id` (foreign key)
  - `expires` (timestamp)

### 5. **signup_keys**
- **Purpose**: Manages signup/invitation keys for user registration
- **Fields**:
  - `id` (primary key)
  - `key` (invitation key)
  - `organization_id` (foreign key)
  - `role`
  - `created_by`

### 6. **simrad_lines** ⚠️ **KEY TABLE FOR RADAR DATA**
- **Purpose**: Stores raw radar scan line data from Simrad radar systems
- **Fields**:
  - `id` (primary key)
  - `packet_id` (links to simrad_packets)
  - `angle` (double precision) - Radar scan angle
  - `angle_index` (integer) - Index of the angle
  - `range` (integer) - Distance in meters
  - `intensities` (integer[]) - Array of radar return intensities
- **Data Volume**: This table contains the **bulk of the data** (likely hundreds of thousands of records)

### 7. **simrad_packets** ⚠️ **KEY TABLE FOR RADAR DATA**
- **Purpose**: Stores metadata about radar data packets
- **Fields**:
  - `id` (primary key)
  - `timestamp` (timestamp with time zone) - When the packet was received
  - `packet_length` (integer) - Size of the packet
- **Relationship**: Each packet can have multiple `simrad_lines` associated with it

### 8. **users**
- **Purpose**: User account management
- **Fields**:
  - `id` (primary key)
  - `username`
  - `email`
  - `password` (hashed)
  - `role`
  - `verified` (boolean)
  - `organization_id` (foreign key)

## Key Insights

### Radar Data Structure

The database is primarily designed to store **raw radar scan data**:

1. **Radar Packets** (`simrad_packets`):
   - Each packet represents a single radar scan/sweep
   - Contains timestamp and packet size
   - Acts as a parent record for scan lines

2. **Radar Scan Lines** (`simrad_lines`):
   - Each line represents a single angle/direction in a radar sweep
   - Contains:
     - **Angle**: Direction of the scan (e.g., -90° to +90°)
     - **Range**: Distance from radar (in meters)
     - **Intensities**: Array of signal strength values at different ranges
   - This is the **raw radar return data** that needs to be processed to detect vessels

### Data Processing Flow

```
Radar Hardware
    ↓
Raw Radar Packets → simrad_packets table
    ↓
Radar Scan Lines → simrad_lines table (angle, range, intensities)
    ↓
Server Processing (NOT in this database)
    ↓
Vessel Detection & Tracking
    ↓
Vessel Data → Sent to Frontend (via API)
    ↓
Radar Display (your React app)
```

## What This File Is Used For

1. **Database Backup**: Complete backup of the production database
2. **Development**: Restore database structure and sample data for development
3. **Data Analysis**: Analyze radar data patterns and vessel detection algorithms
4. **Testing**: Test vessel processing algorithms with real radar data
5. **Documentation**: Understand the database schema and data structure

## Important Notes

⚠️ **No Direct Vessel Table**: The database does NOT contain a processed vessel table. Vessels must be:
- Detected from `simrad_lines` intensity patterns
- Tracked across multiple scans
- Processed server-side to calculate position, speed, heading
- Sent to the frontend via API in the format specified in `VESSEL_DATA_FORMAT.md`

⚠️ **Large File Size**: At ~279,355 lines, this file contains a significant amount of radar scan data. The `simrad_lines` table likely contains hundreds of thousands of records representing radar sweeps over time.

⚠️ **Data Format**: The radar data is stored as:
- **Angles**: Double precision (e.g., -90.0, 37.265625, etc.)
- **Ranges**: Integer meters (e.g., 0, 512, etc.)
- **Intensities**: Integer arrays (e.g., `{0,0,0,0,0,0,...}` representing signal strength at each range bin)

## Related Files

- `VESSEL_DATA_FORMAT.md`: Specifies the format for vessel data sent from server to frontend
- `src/wasm/radarModule.ts`: TypeScript interface for processing vessel data
- `src/components/Radar.tsx`: React component that displays vessels on radar

## Restoration

To restore this database backup:

```bash
# PostgreSQL restore command
psql -U dbmasteruser -d database_name < db_backup_2025-07-16.sql
```

Or using pg_restore for custom format dumps.
