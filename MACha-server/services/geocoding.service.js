/**
 * Geocoding Service
 * Converts location names/addresses to latitude and longitude coordinates
 * Uses OpenStreetMap Nominatim API (free, no API key required)
 */

/**
 * Geocode a location name to get coordinates
 * @param {string} locationName - The location name (e.g., "Hốc Môn, HCM" or "Ho Chi Minh City")
 * @returns {Promise<{latitude: number, longitude: number, display_name: string} | null>}
 */
export const geocodeLocation = async (locationName) => {
    if (!locationName || typeof locationName !== 'string' || locationName.trim().length === 0) {
        throw new Error('Location name is required');
    }

    try {
        // Add "Vietnam" to improve accuracy for Vietnamese locations
        const searchQuery = locationName.trim();
        const queryWithCountry = searchQuery.includes('Vietnam') || searchQuery.includes('Việt Nam')
            ? searchQuery
            : `${searchQuery}, Vietnam`;

        // Encode the query for URL
        const encodedQuery = encodeURIComponent(queryWithCountry);
        
        // Use Nominatim API (free, no API key required)
        // Add a small delay to respect rate limits (1 request per second)
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=1&addressdetails=1`;
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'MACha-Charity-Platform/1.0' // Required by Nominatim
            }
        });

        if (!response.ok) {
            throw new Error(`Geocoding API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (!data || data.length === 0) {
            console.warn(`No results found for location: ${locationName}`);
            return null;
        }

        const result = data[0];
        const latitude = parseFloat(result.lat);
        const longitude = parseFloat(result.lon);

        if (isNaN(latitude) || isNaN(longitude)) {
            throw new Error('Invalid coordinates returned from geocoding service');
        }

        return {
            latitude,
            longitude,
            display_name: result.display_name || locationName
        };
    } catch (error) {
        console.error('Geocoding error:', error);
        throw new Error(`Failed to geocode location "${locationName}": ${error.message}`);
    }
};

/**
 * Reverse geocode coordinates to get location name
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @returns {Promise<string | null>}
 */
export const reverseGeocode = async (latitude, longitude) => {
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        throw new Error('Valid latitude and longitude are required');
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        throw new Error('Invalid coordinate values');
    }

    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`;
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'MACha-Charity-Platform/1.0'
            }
        });

        if (!response.ok) {
            throw new Error(`Reverse geocoding API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (!data || !data.display_name) {
            return null;
        }

        return data.display_name;
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        throw new Error(`Failed to reverse geocode coordinates: ${error.message}`);
    }
};

