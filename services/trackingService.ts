import {
  TrackingLinkInput,
  TrackingLinkResult
} from '@/models/TrackingLink';
import { resolveTrackingPath } from '@/models/TrackingDestinationResolver';

export interface TrackingParams {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    ref?: string; // Affiliate handle
    ref_id?: string; // Affiliate ID
    [key: string]: string | undefined;
}

const STORAGE_KEY = 'flux_attribution_data';

export const trackingService = {
    captureUrlParams: () => {
        const params = new URLSearchParams(window.location.hash.includes('?') ? window.location.hash.split('?')[1] : window.location.search);
        const tracking: any = {};
        params.forEach((val, key) => { tracking[key] = val; });
        if (Object.keys(tracking).length > 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ params: tracking, ts: Date.now() }));
        }
    },
    getStoredParams: (): TrackingParams => {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw).params : {};
    },
    getAffiliateRefId: () => {
        const params = trackingService.getStoredParams();
        return params.ref_id || params.ref; // Try ID first
    },
    getAffiliateRef: () => {
        const params = trackingService.getStoredParams();
        return params.ref;
    },
    generateTrackingLink: (base: string, params: TrackingParams) => {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => v && query.set(k, v));
        return `${base}${base.includes('?') ? '&' : '?'}${query.toString()}`;
    },
    clear: () => localStorage.removeItem(STORAGE_KEY),
    hardReset: () => localStorage.removeItem(STORAGE_KEY)
};

/**
 * Pure business logic model for generating tracking links
 */
export function generateTrackingLinkModel(
  input: TrackingLinkInput
): TrackingLinkResult {
  const { destinationType, groupId, params } = input;

  const path = resolveTrackingPath(destinationType, groupId);

  const baseUrl = `${window.location.origin}/#${path}`;

  const searchParams = new URLSearchParams({
    utm_source: params.utm_source || '',
    utm_medium: params.utm_medium || '',
    utm_campaign: params.utm_campaign || 'generic'
  });

  return {
    baseUrl,
    finalUrl: `${baseUrl}?${searchParams.toString()}`
  };
}
