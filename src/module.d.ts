/// <reference types="vite/client" />
/// <reference types="vite-svg-loader" />

declare module 'coordinate_to_country' {
  function coordinate_to_country(lat: number, lng: number, isoA2?: boolean): string[]
  export = coordinate_to_country
}
