#include <emscripten.h>
#include <cmath>
#include <vector>

// Vessel structure
struct Vessel {
    float x;           // X position (meters)
    float y;           // Y position (meters)
    float speed;       // Speed (m/s)
    float heading;     // Heading (radians)
    float course;      // Course (radians)
    int id;           // Unique ID
    char callsign[16]; // Vessel callsign
};

// Radar data
static std::vector<Vessel> vessels;
static float ownShipX = 0.0f;
static float ownShipY = 0.0f;
static float ownShipHeading = 0.0f;
static float radarRange = 10000.0f; // 10 km range
static int timeStep = 0;

// Initialize with some fake vessels
extern "C" {
    EMSCRIPTEN_KEEPALIVE
    void initRadar() {
        vessels.clear();
        vessels.resize(8);
        
        // Vessel 1 - Ahead
        vessels[0] = {2000.0f, 1500.0f, 8.0f, 0.78f, 0.78f, 1, "SHIP-001"};
        
        // Vessel 2 - Port side
        vessels[1] = {-1500.0f, -800.0f, 12.0f, 3.14f, 3.14f, 2, "SHIP-002"};
        
        // Vessel 3 - Starboard side
        vessels[2] = {1800.0f, -1200.0f, 6.0f, 2.35f, 2.35f, 3, "SHIP-003"};
        
        // Vessel 4 - Astern
        vessels[3] = {-2500.0f, -1500.0f, 10.0f, -2.36f, -2.36f, 4, "SHIP-004"};
        
        // Vessel 5 - Crossing
        vessels[4] = {1200.0f, 2000.0f, 14.0f, 1.57f, 1.57f, 5, "SHIP-005"};
        
        // Vessel 6 - Port bow
        vessels[5] = {-800.0f, 2200.0f, 9.0f, 0.39f, 0.39f, 6, "SHIP-006"};
        
        // Vessel 7 - Starboard quarter
        vessels[6] = {3000.0f, -2200.0f, 7.0f, -1.18f, -1.18f, 7, "SHIP-007"};
        
        // Vessel 8 - Far port
        vessels[7] = {-3500.0f, 800.0f, 11.0f, 2.94f, 2.94f, 8, "SHIP-008"};
        
        timeStep = 0;
    }

    // Update vessel positions based on their movement
    EMSCRIPTEN_KEEPALIVE
    void updateRadar() {
        timeStep++;
        
        // Maximum speed cap: 10 knots in meters per second
        const float MAX_SPEED_MPS = 10.0f * 0.514444f;

        for (auto& vessel : vessels) {
            // Update position based on speed and course (slower movement)
            const float speedScale = 0.2f; // reduce movement to 20%
            const float effectiveSpeed = (vessel.speed > MAX_SPEED_MPS ? MAX_SPEED_MPS : vessel.speed);
            float dx = cos(vessel.heading) * effectiveSpeed * speedScale;
            float dy = sin(vessel.heading) * effectiveSpeed * speedScale;
            
            vessel.x += dx;
            vessel.y += dy;
            
            // Some vessels make slight course corrections
            if (timeStep % 50 == 0) {
                float courseChange = (rand() % 100 - 50) * 0.01f;
                vessel.heading += courseChange;
                vessel.course = vessel.heading;
            }
            
            // Boundary handling - wrap around
            if (fabs(vessel.x) > radarRange * 1.2f) {
                vessel.x = -vessel.x * 0.9f;
            }
            if (fabs(vessel.y) > radarRange * 1.2f) {
                vessel.y = -vessel.y * 0.9f;
            }
        }
    }

    // Get vessel count
    EMSCRIPTEN_KEEPALIVE
    int getVesselCount() {
        return vessels.size();
    }

    // Get vessel data
    EMSCRIPTEN_KEEPALIVE
    void getVesselData(float* data, int maxCount) {
        int count = std::min(maxCount, (int)vessels.size());
        for (int i = 0; i < count; i++) {
            data[i * 5 + 0] = vessels[i].x;
            data[i * 5 + 1] = vessels[i].y;
            data[i * 5 + 2] = vessels[i].speed;
            data[i * 5 + 3] = vessels[i].heading;
            data[i * 5 + 4] = (float)vessels[i].id;
        }
    }

    // Get vessel callsign
    EMSCRIPTEN_KEEPALIVE
    const char* getVesselCallsign(int index) {
        if (index >= 0 && index < vessels.size()) {
            return vessels[index].callsign;
        }
        return "UNKNOWN";
    }

    // Get radar range
    EMSCRIPTEN_KEEPALIVE
    float getRadarRange() {
        return radarRange;
    }

    // Set own ship position
    EMSCRIPTEN_KEEPALIVE
    void setOwnShip(float x, float y, float heading) {
        ownShipX = x;
        ownShipY = y;
        ownShipHeading = heading;
    }
}

