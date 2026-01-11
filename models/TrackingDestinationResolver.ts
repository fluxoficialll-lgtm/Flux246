import { TrackingDestinationType } from './TrackingLink';

export function resolveTrackingPath(
  type: TrackingDestinationType,
  groupId: string
): string {
  switch (type) {
    case 'VIP_GROUP_SALES':
      return `/vip-group-sales/${groupId}`;

    case 'GROUP_LANDING':
      return `/group-landing/${groupId}`;

    default:
      throw new Error('Invalid tracking destination type');
  }
}
