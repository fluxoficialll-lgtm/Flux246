
import { API_BASE } from '../apiConfig';
import { User, Group } from '../types';

const PROXY_BASE = `${API_BASE}/api/paypal`;

const safeFetch = async (url: string, options: RequestInit = {}) => {
    const res = await fetch(url, options);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Request failed: ${res.status}`);
    }
    return res.json();
};

export const paypalService = {
    authenticate: async (clientId: string, clientSecret: string) => {
        return safeFetch(`${PROXY_BASE}/auth-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId, clientSecret })
        });
    },

    createOrder: async (group: Group, ownerEmail: string) => {
        return safeFetch(`${PROXY_BASE}/create-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                amount: parseFloat(group.price || '0'),
                currency: group.currency || 'BRL',
                description: `Acesso VIP: ${group.name}`,
                ownerEmail
            })
        });
    },

    checkOrderStatus: async (orderId: string, ownerEmail: string) => {
        return safeFetch(`${PROXY_BASE}/check-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId, ownerEmail })
        });
    }
};
