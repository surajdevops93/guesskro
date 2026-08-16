/**
 * lib/analytics.ts
 * ----------------------------------------------------------------------------
 * Client-side helper that parses navigator.userAgent into the fields
 * players.device_type / os / browser / user_agent_raw expect. Runs once,
 * silently, when the player lands on the quiz — no permission prompts,
 * no visible UI, just background data capture for the analytics pipeline.
 *
 * Uses ua-parser-js — small, dependency-free, and far more reliable than
 * hand-rolled regex for the long tail of in-app browsers (Instagram
 * WebView, WhatsApp WebView, etc.) that matter a lot here since this app
 * is specifically designed to be shared and opened FROM those apps.
 * ----------------------------------------------------------------------------
 */

import { UAParser } from 'ua-parser-js';

export interface DeviceAnalytics {
  device_type: 'mobile' | 'tablet' | 'desktop';
  os: string;
  browser: string;
  referrer: string;
  user_agent_raw: string;
}

export function captureDeviceAnalytics(): DeviceAnalytics {
  const parser = new UAParser(); // reads navigator.userAgent automatically in-browser
  const result = parser.getResult();

  // ua-parser-js reports device.type as 'mobile' | 'tablet' | undefined.
  // Undefined means desktop (it only flags non-desktop form factors).
  const deviceType: DeviceAnalytics['device_type'] =
    result.device.type === 'mobile'
      ? 'mobile'
      : result.device.type === 'tablet'
      ? 'tablet'
      : 'desktop';

  return {
    device_type: deviceType,
    os: result.os.name ? `${result.os.name} ${result.os.version ?? ''}`.trim() : 'Unknown',
    browser: result.browser.name ?? 'Unknown',
    // Tells you WHICH platform the share was opened from (WhatsApp/Instagram/
    // direct) — this is the single highest-signal field for viral loop analytics.
    referrer: typeof document !== 'undefined' ? document.referrer || 'direct' : 'direct',
    user_agent_raw: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  };
}