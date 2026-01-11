import { API_BASE } from '../apiConfig';
import { Group } from '../types';

const PROXY_BASE = `${API_BASE}/api/stripe`;

const safeFetch = async (url: string, options: RequestInit = {}) => {
    const res = await fetch(url, options);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Request failed: ${res.status}`);
    }
    return res.json();
};

export const stripeService = {
    authenticate: async (secretKey: string) => {
        return safeFetch(`${PROXY_BASE}/auth-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secretKey })
        });
    },

    createCheckoutSession: async (group: Group, ownerEmail: string) => {
        const successUrl = `${window.location.origin}/#/vip-group-sales/${group.id}?session_id={CHECKOUT_SESSION_ID}&success=true`;
        const cancelUrl = `${window.location.origin}/#/vip-group-sales/${group.id}?success=false`;

        return safeFetch(`${PROXY_BASE}/create-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                group, 
                ownerEmail,
                successUrl,
                cancelUrl
            })
        });
    },

    checkSessionStatus: async (sessionId: string, ownerEmail: string) => {
        return safeFetch(`${PROXY_BASE}/check-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, ownerEmail })
        });
    }
};