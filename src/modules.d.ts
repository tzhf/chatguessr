declare module 'country-iso' {
    export function get(lat: number, lng: number): string[];
}
declare module 'country-iso-3-to-2' {
    function countryIso3To2(iso: string): string | undefined;
    export = countryIso3To2;
}