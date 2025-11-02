// Centralized streaming service configuration
export const SERVICE_LOGOS: { [key: number]: string } = {
  8: 'Netflix',
  119: 'Prime Video',
  337: 'Disney+',
  15: 'Hulu',
  350: 'Apple TV+',
  1899: 'Max',
  531: 'Paramount+',
  387: 'Peacock',
  384: 'HBO Max',
  2: 'Apple TV',
  3: 'Google Play',
  283: 'Crunchyroll',
  257: 'Fubo TV',
  192: 'YouTube',
  389: 'Showtime',
  1853: 'AMC+',
  279: 'Tubi TV',
};

export function getServiceName(providerId: number): string {
  return SERVICE_LOGOS[providerId] || 'Unknown';
}
