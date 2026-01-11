
import axios from 'axios';
import { dbManager } from '../databaseManager.js';

const STRIPE_API_BASE = 'https://api.stripe.com/v1';

/**
 * Serviço de integração com Stripe API v1
 */
export const stripeService = {
    /**
     * Verifica as credenciais da Stripe buscando informações da conta
     */
    verifyCredentials: async (secretKey) => {
        try {
            const response = await axios.get(`${STRIPE_API_BASE}/account`, {
                auth: { username: secretKey, password: '' }
            });
            return response.data;
        } catch (error) {
            console.error('Stripe Auth Error:', error.response?.data || error.message);
            throw new Error('Falha na autenticação com a Stripe. Verifique sua chave secreta.');
        }
    },

    /**
     * Cria uma sessão de Checkout para pagamento ou assinatura
     */
    createCheckoutSession: async (secretKey, group, ownerEmail, successUrl, cancelUrl) => {
        try {
            const isSubscription = group.accessType === 'temporary';
            const params = new URLSearchParams();
            
            // Define o modo: pagamento único ou assinatura recorrente
            params.append('mode', isSubscription ? 'subscription' : 'payment');
            
            // Ativa métodos de pagamento automáticos (incluindo BNPL se configurado no dashboard)
            params.append('automatic_payment_methods[enabled]', 'true');

            params.append('line_items[0][price_data][currency]', (group.currency || 'BRL').toLowerCase());
            params.append('line_items[0][price_data][product_data][name]', `Acesso VIP: ${group.name}`);
            params.append('line_items[0][price_data][unit_amount]', Math.round(parseFloat(group.price) * 100));
            
            if (isSubscription) {
                // Configura recorrência mensal básica (ajustável conforme billingCycleDays)
                params.append('line_items[0][price_data][recurring][interval]', 'month');
            }
            
            params.append('line_items[0][quantity]', '1');
            params.append('success_url', successUrl);
            params.append('cancel_url', cancelUrl);
            
            // Metadados cruciais para o Webhook processar o pedido depois
            params.append('metadata[groupId]', group.id);
            params.append('metadata[ownerEmail]', ownerEmail);
            
            // Busca o email do comprador para associar na Stripe (se disponível)
            const buyer = await dbManager.users.findByEmail(group.buyerEmail); // Assumindo que passamos buyerEmail
            if (buyer) {
                params.append('customer_email', buyer.email);
                params.append('metadata[userId]', buyer.id);
            }

            const response = await axios.post(`${STRIPE_API_BASE}/checkout/sessions`, params, {
                auth: { username: secretKey, password: '' },
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            return {
                id: response.data.id,
                url: response.data.url
            };
        } catch (error) {
            console.error('Stripe Session Error:', error.response?.data || error.message);
            throw new Error('Erro ao criar checkout na Stripe.');
        }
    },

    /**
     * Processador central de Webhooks da Stripe
     */
    handleWebhook: async (event) => {
        const type = event.type;
        const data = event.data.object;

        console.log(`[Stripe Webhook] Evento recebido: ${type}`);

        switch (type) {
            case 'checkout.session.completed':
                await stripeService.fulfillOrder(data);
                break;
            case 'invoice.payment_succeeded':
                // Útil para renovações de assinaturas
                if (data.billing_reason === 'subscription_cycle') {
                    await stripeService.handleSubscriptionRenewal(data);
                }
                break;
            case 'customer.subscription.deleted':
                // Usuário cancelou ou pagamento falhou após tentativas
                await stripeService.revokeAccess(data);
                break;
            default:
                console.log(`[Stripe Webhook] Evento não processado: ${type}`);
        }
    },

    /**
     * Finaliza o pedido: Libera VIP e registra financeiro
     */
    fulfillOrder: async (session) => {
        const { groupId, ownerEmail, userId } = session.metadata;
        const amount = session.amount_total / 100;
        const currency = session.currency.toUpperCase();
        const providerTxId = session.id;

        console.log(`[Stripe Fulfill] Liberando grupo ${groupId} para usuário ${userId || 'N/A'}`);

        try {
            // 1. Encontra o usuário pelo ID ou Email da sessão
            let buyer = null;
            if (userId) buyer = await dbManager.users.findById(userId);
            else if (session.customer_details?.email) buyer = await dbManager.users.findByEmail(session.customer_details.email);

            if (!buyer) {
                console.error("[Stripe Webhook Error] Comprador não localizado no banco.");
                return;
            }

            // 2. Libera acesso VIP no banco
            await dbManager.vip.grantAccess(buyer.id, groupId, 'active', {
                stripeSessionId: session.id,
                subscriptionId: session.subscription || null,
                paymentStatus: 'paid'
            });

            // 3. Registra a transação financeira
            await dbManager.financial.recordTransaction({
                userId: buyer.id,
                type: 'sale',
                amount: amount,
                status: 'paid',
                providerTxId: providerTxId,
                currency: currency,
                data: { providerId: 'stripe', groupId }
            });

            console.log(`✅ [Stripe Webhook] Pedido ${session.id} finalizado com sucesso.`);
        } catch (e) {
            console.error(`❌ [Stripe Webhook Error] Falha ao processar checkout.session.completed:`, e.message);
        }
    },

    /**
     * Verifica o status de uma sessão de checkout (Polling Fallback)
     */
    checkSessionStatus: async (secretKey, sessionId) => {
        try {
            const response = await axios.get(`${STRIPE_API_BASE}/checkout/sessions/${sessionId}`, {
                auth: { username: secretKey, password: '' }
            });
            
            const isPaid = response.data.payment_status === 'paid';
            return {
                status: isPaid ? 'paid' : 'pending',
                details: response.data
            };
        } catch (error) {
            console.error('Stripe Status Error:', error.response?.data || error.message);
            throw new Error('Falha ao verificar status na Stripe.');
        }
    }
};
