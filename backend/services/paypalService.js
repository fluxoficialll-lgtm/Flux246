
import axios from 'axios';

const PAYPAL_API_URL = process.env.NODE_ENV === 'production' 
    ? 'https://api-m.paypal.com' 
    : 'https://api-m.sandbox.paypal.com';

/**
 * Gets a PayPal Access Token using Client ID and Secret
 */
const getAccessToken = async (clientId, clientSecret) => {
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    try {
        const response = await axios.post(`${PAYPAL_API_URL}/v1/oauth2/token`, 'grant_type=client_credentials', {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        return response.data.access_token;
    } catch (error) {
        console.error('PayPal Auth Error:', error.response?.data || error.message);
        throw new Error('Falha na autenticação com o PayPal.');
    }
};

export const paypalService = {
    /**
     * Verifies if the credentials are valid by attempting to get a token
     */
    verifyCredentials: async (clientId, clientSecret) => {
        return await getAccessToken(clientId, clientSecret);
    },

    /**
     * Creates a PayPal Order
     */
    createOrder: async (clientId, clientSecret, amount, currency = 'BRL', description = '') => {
        const token = await getAccessToken(clientId, clientSecret);
        
        const payload = {
            intent: 'CAPTURE',
            purchase_units: [{
                amount: {
                    currency_code: currency,
                    value: amount.toFixed(2)
                },
                description: description
            }],
            application_context: {
                brand_name: 'Flux Platform',
                user_action: 'PAY_NOW',
                shipping_preference: 'NO_SHIPPING'
            }
        };

        try {
            const response = await axios.post(`${PAYPAL_API_URL}/v2/checkout/orders`, payload, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const approvalLink = response.data.links.find(link => link.rel === 'approve')?.href;
            
            return {
                id: response.data.id,
                status: response.data.status,
                approvalLink
            };
        } catch (error) {
            console.error('PayPal Create Order Error:', error.response?.data || error.message);
            throw new Error('Falha ao criar pedido no PayPal.');
        }
    },

    /**
     * Checks status and captures the order if approved
     */
    checkStatus: async (clientId, clientSecret, orderId) => {
        const token = await getAccessToken(clientId, clientSecret);
        
        try {
            // First check the order status
            const checkRes = await axios.get(`${PAYPAL_API_URL}/v2/checkout/orders/${orderId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (checkRes.data.status === 'APPROVED') {
                // Capture the payment
                const captureRes = await axios.post(`${PAYPAL_API_URL}/v2/checkout/orders/${orderId}/capture`, {}, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                return { 
                    status: 'paid', 
                    details: captureRes.data 
                };
            }

            if (checkRes.data.status === 'COMPLETED') {
                return { status: 'paid', details: checkRes.data };
            }

            return { status: 'pending', rawStatus: checkRes.data.status };

        } catch (error) {
            console.error('PayPal Capture/Status Error:', error.response?.data || error.message);
            // If already captured or not found, handle gracefully
            if (error.response?.status === 422) {
                return { status: 'paid', note: 'Likely already captured' };
            }
            throw new Error('Falha ao verificar status no PayPal.');
        }
    }
};
