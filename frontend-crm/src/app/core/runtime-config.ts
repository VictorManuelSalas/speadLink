export interface SpeedlinkRuntimeConfig {
  readonly googleMapsApiKey?: string;
  readonly apiBaseUrl?: string;
}

declare global {
  interface Window {
    __SPEEDLINK_CONFIG__?: SpeedlinkRuntimeConfig;
  }
}

export function runtimeConfig(): SpeedlinkRuntimeConfig {
  return window.__SPEEDLINK_CONFIG__ ?? {};
}
