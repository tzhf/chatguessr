// Code by itisem https://github.com/itisem/coordinate_to_country

import GeoJsonGeometriesLookup from 'geojson-geometries-lookup'
import borders from '@osm_borders/maritime_10m'

// Build the spatial index once at module load, not per-call
const search = new GeoJsonGeometriesLookup(borders)

/**
 * @param lat Latitude
 * @param lng Longitude
 * @param isoA2 Return the 2-letter code instead of the 3-letter code
 * @returns Array of country codes this coordinate falls within
 */
export default function coordinateToCountry(lat: number, lng: number, isoA2 = false): string[] {
  const countries = search.getContainers({
    type: 'Point',
    coordinates: [lng, lat]
  })

  if (countries.features.length > 0) {
    return isoA2
      ? countries.features.map((f: any) => f.properties.isoA2)
      : countries.features.map((f: any) => f.properties.isoA3)
  }

  return []
}
