// Centralized streaming service configuration
export interface StreamingService {
  id: number;
  name: string;
  color: string; // Background color when selected
  textColor: string; // Text color for contrast
}

export const STREAMING_SERVICES: { [key: number]: StreamingService } = {
  8: { id: 8, name: 'Netflix', color: 'rgb(229, 9, 20)', textColor: 'rgb(255, 255, 255)' },
  119: { id: 119, name: 'Prime Video', color: 'rgb(0, 168, 225)', textColor: 'rgb(255, 255, 255)' },
  337: { id: 337, name: 'Disney+', color: 'rgb(17, 60, 207)', textColor: 'rgb(255, 255, 255)' },
  15: { id: 15, name: 'Hulu', color: 'rgb(28, 231, 131)', textColor: 'rgb(0, 0, 0)' },
  350: { id: 350, name: 'Apple TV+', color: 'rgb(0, 0, 0)', textColor: 'rgb(255, 255, 255)' },
  1899: { id: 1899, name: 'Max', color: 'rgb(0, 35, 246)', textColor: 'rgb(255, 255, 255)' },
  531: { id: 531, name: 'Paramount+', color: 'rgb(0, 105, 255)', textColor: 'rgb(255, 255, 255)' },
  387: { id: 387, name: 'Peacock', color: 'rgb(0, 0, 0)', textColor: 'rgb(255, 255, 255)' },
  384: { id: 384, name: 'HBO Max', color: 'rgb(0, 35, 246)', textColor: 'rgb(255, 255, 255)' },
  2: { id: 2, name: 'Apple TV', color: 'rgb(0, 0, 0)', textColor: 'rgb(255, 255, 255)' },
  3: { id: 3, name: 'Google Play', color: 'rgb(66, 133, 244)', textColor: 'rgb(255, 255, 255)' },
  283: { id: 283, name: 'Crunchyroll', color: 'rgb(244, 123, 38)', textColor: 'rgb(255, 255, 255)' },
  257: { id: 257, name: 'Fubo TV', color: 'rgb(255, 51, 102)', textColor: 'rgb(255, 255, 255)' },
  192: { id: 192, name: 'YouTube', color: 'rgb(255, 0, 0)', textColor: 'rgb(255, 255, 255)' },
  389: { id: 389, name: 'Showtime', color: 'rgb(196, 7, 27)', textColor: 'rgb(255, 255, 255)' },
  1853: { id: 1853, name: 'AMC+', color: 'rgb(0, 0, 0)', textColor: 'rgb(255, 255, 255)' },
  279: { id: 279, name: 'Tubi TV', color: 'rgb(250, 88, 40)', textColor: 'rgb(255, 255, 255)' },
};

// Legacy support
export const SERVICE_LOGOS: { [key: number]: string } = Object.fromEntries(
  Object.entries(STREAMING_SERVICES).map(([id, service]) => [id, service.name])
);

export function getServiceName(providerId: number): string {
  return STREAMING_SERVICES[providerId]?.name || 'Unknown';
}

export function getServiceInfo(providerId: number): StreamingService | null {
  return STREAMING_SERVICES[providerId] || null;
}
