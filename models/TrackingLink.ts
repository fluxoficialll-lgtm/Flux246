export type TrackingDestinationType =
  | 'VIP_GROUP_SALES'
  | 'GROUP_LANDING';

export interface TrackingParams {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
}

export interface TrackingLinkInput {
  destinationType: TrackingDestinationType;
  groupId: string;
  params: TrackingParams;
}

export interface TrackingLinkResult {
  baseUrl: string;
  finalUrl: string;
}
