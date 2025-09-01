import { NextRequest, NextResponse } from 'next/server';

// Mock geocoding for Canadian addresses
// In production, this would use AWS Location Service or similar
export async function POST(request: NextRequest) {
  try {
    const { address, city, province, postalCode } = await request.json();

    if (!address || !city || !province || !postalCode) {
      return NextResponse.json(
        { error: 'All address fields are required' },
        { status: 400 }
      );
    }

    // Validate Canadian postal code format
    const postalCodeRegex = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;
    if (!postalCodeRegex.test(postalCode)) {
      return NextResponse.json(
        { error: 'Invalid Canadian postal code format' },
        { status: 400 }
      );
    }

    // Mock geocoding based on province and city
    // In production, use AWS Location Service PlaceIndex
    const coordinates = getMockCoordinates(city, province);

    return NextResponse.json({
      lat: coordinates.lat,
      lng: coordinates.lng,
      formatted_address: `${address}, ${city}, ${province} ${postalCode}`,
      confidence: 0.95
    });

  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json(
      { error: 'Failed to geocode address' },
      { status: 500 }
    );
  }
}

// Mock coordinate data for major Canadian cities
function getMockCoordinates(city: string, province: string): { lat: number; lng: number } {
  const cityKey = `${city.toLowerCase()}_${province.toUpperCase()}`;
  
  const coordinates: Record<string, { lat: number; lng: number }> = {
    // Ontario
    'toronto_ON': { lat: 43.6532, lng: -79.3832 },
    'ottawa_ON': { lat: 45.4215, lng: -75.6972 },
    'mississauga_ON': { lat: 43.5890, lng: -79.6441 },
    'hamilton_ON': { lat: 43.2557, lng: -79.8711 },
    'london_ON': { lat: 42.9849, lng: -81.2453 },
    'kitchener_ON': { lat: 43.4516, lng: -80.4925 },
    
    // Quebec
    'montreal_QC': { lat: 45.5017, lng: -73.5673 },
    'quebec city_QC': { lat: 46.8139, lng: -71.2080 },
    'laval_QC': { lat: 45.6066, lng: -73.7124 },
    'gatineau_QC': { lat: 45.4765, lng: -75.7013 },
    
    // British Columbia
    'vancouver_BC': { lat: 49.2827, lng: -123.1207 },
    'surrey_BC': { lat: 49.1913, lng: -122.8490 },
    'burnaby_BC': { lat: 49.2488, lng: -122.9805 },
    'richmond_BC': { lat: 49.1666, lng: -123.1336 },
    'victoria_BC': { lat: 48.4284, lng: -123.3656 },
    
    // Alberta
    'calgary_AB': { lat: 51.0447, lng: -114.0719 },
    'edmonton_AB': { lat: 53.5461, lng: -113.4938 },
    'red deer_AB': { lat: 52.2690, lng: -113.8116 },
    'lethbridge_AB': { lat: 49.6956, lng: -112.8451 },
    
    // Manitoba
    'winnipeg_MB': { lat: 49.8951, lng: -97.1384 },
    'brandon_MB': { lat: 49.8485, lng: -99.9501 },
    
    // Saskatchewan
    'saskatoon_SK': { lat: 52.1332, lng: -106.6700 },
    'regina_SK': { lat: 50.4452, lng: -104.6189 },
    
    // Nova Scotia
    'halifax_NS': { lat: 44.6488, lng: -63.5752 },
    'dartmouth_NS': { lat: 44.6652, lng: -63.5677 },
    
    // New Brunswick
    'fredericton_NB': { lat: 45.9636, lng: -66.6431 },
    'moncton_NB': { lat: 46.0878, lng: -64.7782 },
    'saint john_NB': { lat: 45.2733, lng: -66.0633 },
    
    // Newfoundland and Labrador
    'st. john\'s_NL': { lat: 47.5615, lng: -52.7126 },
    'mount pearl_NL': { lat: 47.5189, lng: -52.8058 },
    
    // Prince Edward Island
    'charlottetown_PE': { lat: 46.2382, lng: -63.1311 },
    'summerside_PE': { lat: 46.3959, lng: -63.7876 },
    
    // Territories
    'whitehorse_YT': { lat: 60.7212, lng: -135.0568 },
    'yellowknife_NT': { lat: 62.4540, lng: -114.3718 },
    'iqaluit_NU': { lat: 63.7467, lng: -68.5170 }
  };

  // Try to find exact match
  if (coordinates[cityKey]) {
    return coordinates[cityKey];
  }

  // Try partial match
  const cityLower = city.toLowerCase();
  for (const [key, coords] of Object.entries(coordinates)) {
    if (key.includes(cityLower) && key.endsWith(`_${province.toUpperCase()}`)) {
      return coords;
    }
  }

  // Default coordinates based on province
  const provinceDefaults: Record<string, { lat: number; lng: number }> = {
    'ON': { lat: 43.6532, lng: -79.3832 }, // Toronto
    'QC': { lat: 45.5017, lng: -73.5673 }, // Montreal
    'BC': { lat: 49.2827, lng: -123.1207 }, // Vancouver
    'AB': { lat: 51.0447, lng: -114.0719 }, // Calgary
    'MB': { lat: 49.8951, lng: -97.1384 }, // Winnipeg
    'SK': { lat: 52.1332, lng: -106.6700 }, // Saskatoon
    'NS': { lat: 44.6488, lng: -63.5752 }, // Halifax
    'NB': { lat: 45.9636, lng: -66.6431 }, // Fredericton
    'NL': { lat: 47.5615, lng: -52.7126 }, // St. John's
    'PE': { lat: 46.2382, lng: -63.1311 }, // Charlottetown
    'YT': { lat: 60.7212, lng: -135.0568 }, // Whitehorse
    'NT': { lat: 62.4540, lng: -114.3718 }, // Yellowknife
    'NU': { lat: 63.7467, lng: -68.5170 } // Iqaluit
  };

  return provinceDefaults[province.toUpperCase()] || { lat: 45.4215, lng: -75.6972 }; // Default to Ottawa
}