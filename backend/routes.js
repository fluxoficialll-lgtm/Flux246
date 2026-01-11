
import express from 'express';
import axios from 'axios';
import { dbManager } from './databaseManager.js';
import { facebookCapi } from './services/facebookCapi.js'; 
import { storageService } from './services/storageService.js';
import { googleAuthConfig } from './authConfig.js';
import { paypalService } from './services/paypalService.js';
import { stripeService } from './services/stripeService.js';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';

const router = express.Router();

const client = new OAuth2Client(googleAuthConfig.clientId);

// --- Admin Helper Middleware ---
const validateAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const expectedToken = process.env.VITE_ADMIN_TOKEN || 'ADMIN_TOKEN_V3';
    
    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
        return res.status(401).json({ error: 'Não autorizado. Token de administrador inválido ou ausente.' });
    }
    next();
};

// --- Platform Settings Endpoints ---
router.get('/admin/settings/fees', validateAdmin, async (req, res) => {
    try {
        const fees = await dbManager.settings.getFees();
        res.json(fees);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.patch('/admin/settings/fees', validateAdmin, async (req, res) => {
    try {
        const { sale_fee_type, sale_fee_value, withdrawal_fee } = req.body;
        if (sale_fee_type && !['fixed', 'percent'].includes(sale_fee_type)) {
            return res.status(400).json({ error: "Tipo de taxa de venda inválido. Use 'fixed' ou 'percent'." });
        }
        const currentFees = await dbManager.settings.getFees();
        const updatedFees = {
            ...currentFees,
            sale_fee_type: sale_fee_type || currentFees.sale_fee_type,
            sale_fee_value: sale_fee_value !== undefined ? Number(sale_fee_value) : currentFees.sale_fee_value,
            withdrawal_fee: withdrawal_fee !== undefined ? Number(withdrawal_fee) : currentFees.withdrawal_fee
        };
        await dbManager.settings.updateFees(updatedFees);
        res.json({ success: true, fees: updatedFees });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/reports', async (req, res) => {
    try {
        const { targetId, reporterId, reason } = req.body;
        if (!targetId || !reason) {
            return res.status(400).json({ error: "O usuário denunciado e o motivo são obrigatórios." });
        }
        await dbManager.reports.create({ targetId, reporterId, reason });
        res.json({ success: true, message: "Denúncia registrada com sucesso." });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- Admin Stats Endpoints ---
router.get('/admin/stats/sellers', validateAdmin, async (req, res) => {
    try {
        const stats = await dbManager.admin.getSellersStats();
        res.json(stats);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/admin/stats/financial', validateAdmin, async (req, res) => {
    try {
        const stats = await dbManager.admin.getFinancialStats();
        res.json(stats);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/admin/stats/financial/average-ticket', validateAdmin, async (req, res) => {
    try {
        const stats = await dbManager.admin.getAverageTicketStats();
        res.json(stats);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/admin/stats/providers', validateAdmin, async (req, res) => {
    try {
        const stats = await dbManager.admin.getProviderStats();
        res.json(stats);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/admin/stats/users/total', validateAdmin, async (req, res) => {
    try {
        const count = await dbManager.admin.getTotalUsers();
        res.json({ count });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/admin/stats/users/reported', validateAdmin, async (req, res) => {
    try {
        const count = await dbManager.admin.getReportedUsersCount();
        res.json({ count });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/admin/stats/content/feed', validateAdmin, async (req, res) => {
    try {
        const count = await dbManager.admin.getFeedPostsCount();
        res.json({ count });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/admin/stats/content/reels', validateAdmin, async (req, res) => {
    try {
        const count = await dbManager.admin.getReelsCount();
        res.json({ count });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/admin/stats/content/marketplace', validateAdmin, async (req, res) => {
    try {
        const count = await dbManager.admin.getMarketplaceCount();
        res.json({ count });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/admin/stats/groups/total', validateAdmin, async (req, res) => {
    try {
        const count = await dbManager.admin.getGroupsCount();
        res.json({ count });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- Admin User Actions ---
router.get('/admin/users', validateAdmin, async (req, res) => {
    try {
        const usersList = await dbManager.admin.getUsersList();
        const formatted = usersList.map(u => ({
            id: u.id,
            email: u.email,
            emailVerified: !!u.googleId || !!u.isVerified,
            username: u.profile?.name || 'sem_username',
            displayName: u.profile?.nickname || u.profile?.name || 'Usuário Flux',
            role: u.email === 'admin@maintenance.com' ? 'ADMIN' : (u.paymentConfig?.isConnected ? 'CREATOR' : 'USER'),
            isBanned: !!u.isBanned,
            createdAt: u.createdAt,
            lastIp: u.lastIp || '0.0.0.0',
            strikes: u.strikes || 0,
            permissions: {
                canPostFeed: true,
                canPostReels: true,
                canUseMarketplace: true,
                canCreateGroups: true,
                canConnectPayments: true
            },
            activeSessions: [], 
            stats: u.stats
        }));
        res.json(formatted);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/admin/users/:id/insights', validateAdmin, async (req, res) => {
    try {
        const insights = await dbManager.admin.getUserInsights(req.params.id);
        res.json(insights);
    } catch (e) {
        res.status(e.message === "Usuário não encontrado" ? 404 : 500).json({ error: e.message });
    }
});

router.get('/admin/users/:id/posts', validateAdmin, async (req, res) => {
    try {
        const posts = await dbManager.admin.getUserPosts(req.params.id);
        res.json(posts);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/admin/users/:id/reels', validateAdmin, async (req, res) => {
    try {
        const reels = await dbManager.admin.getUserReels(req.params.id);
        res.json(reels);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/admin/users/:id/feed', validateAdmin, async (req, res) => {
    try {
        const rawFeed = await dbManager.admin.getUserFeed(req.params.id);
        const formattedFeed = rawFeed.map(item => {
            const data = typeof item.data === 'string' ? JSON.parse(item.data) : item.data;
            if (item.source === 'POST') {
                return {
                    id: item.id,
                    type: data.type === 'video' ? 'REEL' : 'POST',
                    content: data.text || '',
                    imageUrl: data.image || null,
                    videoUrl: data.video || null,
                    status: data.isAdultContent ? 'REPORTED' : 'ACTIVE',
                    createdAt: new Date(item.created_at).toISOString()
                };
            } else {
                return {
                    id: item.id,
                    type: 'AD',
                    content: data.creative?.text || data.name || 'Sem título',
                    imageUrl: data.creative?.mediaUrl || null,
                    videoUrl: data.creative?.mediaType === 'video' ? data.creative.mediaUrl : null,
                    status: (data.status || 'ACTIVE').toUpperCase(),
                    createdAt: new Date(item.created_at).toISOString()
                };
            }
        });
        formattedFeed.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(formattedFeed);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/admin/users/:id/groups', validateAdmin, async (req, res) => {
    try {
        const groups = await dbManager.admin.getUserGroups(req.params.id);
        res.json(groups);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/admin/users/:id/reports', validateAdmin, async (req, res) => {
    try {
        const reports = await dbManager.admin.getUserReports(req.params.id);
        res.json(reports);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.patch('/admin/reports/:id/resolve', validateAdmin, async (req, res) => {
    try {
        await dbManager.admin.resolveReport(req.params.id);
        res.json({ success: true, status: "RESOLVED" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.patch('/admin/users/:id/ban', validateAdmin, async (req, res) => {
    try {
        const { reason } = req.body;
        if (!reason) return res.status(400).json({ error: "Motivo do banimento é obrigatório." });
        await dbManager.admin.banUser(req.params.id, reason);
        res.json({ success: true, status: "BANNED" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.patch('/admin/users/:id/unban', validateAdmin, async (req, res) => {
    try {
        await dbManager.admin.unbanUser(req.params.id);
        res.json({ success: true, status: "ACTIVE" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.patch('/admin/users/:id/metadata', validateAdmin, async (req, res) => {
    try {
        const { displayName, username, bio } = req.body;
        const updatedFields = await dbManager.admin.updateMetadata(req.params.id, { displayName, username, bio });
        res.json({ success: true, updated_fields: updatedFields });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/admin/users/:id/ip-history', validateAdmin, async (req, res) => {
    try {
        const history = await dbManager.admin.getUserIpHistory(req.params.id);
        res.json(history);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.patch('/admin/users/:id/strikes', validateAdmin, async (req, res) => {
    try {
        const { count } = req.body;
        await dbManager.admin.updateStrikes(req.params.id, count);
        res.json({ success: true, strikes: count });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- Admin Content Actions ---
router.delete('/admin/content/feed/:id', validateAdmin, async (req, res) => {
    try {
        await dbManager.posts.delete(req.params.id);
        res.json({ success: true, type: "FEED_POST" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.delete('/admin/content/reels/:id', validateAdmin, async (req, res) => {
    try {
        await dbManager.posts.delete(req.params.id);
        res.json({ success: true, type: "REEL" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.delete('/admin/content/marketplace/:id', validateAdmin, async (req, res) => {
    try {
        await dbManager.marketplace.delete(req.params.id);
        res.json({ success: true, type: "MARKETPLACE_ITEM" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.delete('/admin/content/groups/posts/:id', validateAdmin, async (req, res) => {
    try {
        await dbManager.posts.delete(req.params.id);
        res.json({ success: true, type: "GROUP_POST" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- SyncPay Official Partner API V1 ---
const SYNCPAY_API_BASE = 'https://api.syncpayments.com.br/api/partner/v1';

const getSyncPayToken = async (clientId, clientSecret) => {
    try {
        const response = await axios.post(`${SYNCPAY_API_BASE}/auth-token`, {
            client_id: clientId,
            client_secret: clientSecret
        });
        return response.data.access_token;
    } catch (e) {
        throw new Error("Falha na autenticação com o provedor de pagamentos.");
    }
};

router.post('/syncpay/auth-token', async (req, res) => {
    try {
        const { clientId, clientSecret } = req.body;
        if (!clientId || !clientSecret) {
            return res.status(400).json({ error: "Client ID e Client Secret são obrigatórios." });
        }
        await getSyncPayToken(clientId, clientSecret);
        res.json({ success: true, message: "Conexão configurada com sucesso.", data: { status: "ready" } });
    } catch (e) {
        res.status(401).json({ error: e.message });
    }
});

router.post('/syncpay/cash-in', async (req, res) => {
    try {
        const { payload, ownerEmail } = req.body;
        const owner = await dbManager.users.findByEmail(ownerEmail);
        if (!owner || !owner.paymentConfig?.isConnected) {
            return res.status(400).json({ error: "Recebedor não configurado ou desconectado." });
        }
        const token = await getSyncPayToken(owner.paymentConfig.clientId, owner.paymentConfig.clientSecret);
        const response = await axios.post(`${SYNCPAY_API_BASE}/cash-in`, payload, {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
        });
        res.json(response.data);
    } catch (e) {
        res.status(e.response?.status || 500).json({ error: e.response?.data?.message || e.message });
    }
});

router.post('/syncpay/check-status', async (req, res) => {
    try {
        const { transactionId, sellerEmail, clientId, clientSecret } = req.body;
        let creds = { clientId, clientSecret };
        if (!clientId) {
            const seller = await dbManager.users.findByEmail(sellerEmail);
            if (seller?.paymentConfig) {
                creds.clientId = seller.paymentConfig.clientId;
                creds.clientSecret = seller.paymentConfig.clientSecret;
            }
        }
        if (!creds.clientId || !creds.clientSecret) {
            return res.status(400).json({ error: "Credenciais de vendedor não encontradas." });
        }
        const token = await getSyncPayToken(creds.clientId, creds.clientSecret);
        const response = await axios.get(`${SYNCPAY_API_BASE}/transaction/${transactionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        res.json(response.data);
    } catch (e) {
        res.status(e.response?.status || 500).json({ error: e.response?.data?.message || e.message });
    }
});

router.post('/syncpay/balance', async (req, res) => {
    try {
        const { clientId, clientSecret } = req.body;
        const token = await getSyncPayToken(clientId, clientSecret);
        const response = await axios.get(`${SYNCPAY_API_BASE}/balance`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        res.json(response.data);
    } catch (e) {
        res.status(e.response?.status || 500).json({ error: e.response?.data?.message || e.message });
    }
});

router.post('/syncpay/withdraw', async (req, res) => {
    try {
        const { clientId, clientSecret, amount, pixKey, pixKeyType } = req.body;
        const token = await getSyncPayToken(clientId, clientSecret);
        const response = await axios.post(`${SYNCPAY_API_BASE}/cash-out`, {
            amount, pix_key: pixKey, pix_key_type: pixKeyType
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        res.json(response.data);
    } catch (e) {
        res.status(e.response?.status || 500).json({ error: e.response?.data?.message || e.message });
    }
});

// --- PayPal Proxy Routes ---
router.post('/paypal/auth-token', async (req, res) => {
    try {
        const { clientId, clientSecret } = req.body;
        if (!clientId || !clientSecret) return res.status(400).json({ error: "Client ID e Secret Key são obrigatórios." });
        await paypalService.verifyCredentials(clientId, clientSecret);
        res.json({ success: true, message: "PayPal configurado com sucesso." });
    } catch (e) {
        res.status(401).json({ error: e.message });
    }
});

router.post('/paypal/create-order', async (req, res) => {
    try {
        const { amount, currency, description, ownerEmail } = req.body;
        const owner = await dbManager.users.findByEmail(ownerEmail);
        let config = null;
        if (owner?.paymentConfigs?.paypal) config = owner.paymentConfigs.paypal;
        else if (owner?.paymentConfig?.providerId === 'paypal') config = owner.paymentConfig;
        if (!config || !config.isConnected) return res.status(400).json({ error: "Recebedor PayPal não configurado corretamente." });
        const order = await paypalService.createOrder(config.clientId, config.clientSecret, amount, currency || 'BRL', description);
        res.json(order);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/paypal/check-status', async (req, res) => {
    try {
        const { orderId, ownerEmail } = req.body;
        const owner = await dbManager.users.findByEmail(ownerEmail);
        let config = null;
        if (owner?.paymentConfigs?.paypal) config = owner.paymentConfigs.paypal;
        else if (owner?.paymentConfig?.providerId === 'paypal') config = owner.paymentConfig;
        if (!config || !config.isConnected) return res.status(400).json({ error: "Configuração do recebedor não encontrada." });
        const result = await paypalService.checkStatus(config.clientId, config.clientSecret, orderId);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- Stripe Proxy Routes ---
router.post('/stripe/webhook', express.raw({type: 'application/json'}), async (req, res) => {
    try {
        const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        await stripeService.handleWebhook(event);
        res.json({ received: true });
    } catch (err) {
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
});

router.post('/stripe/auth-token', async (req, res) => {
    try {
        const { secretKey } = req.body;
        if (!secretKey) return res.status(400).json({ error: "Chave secreta é obrigatória." });
        await stripeService.verifyCredentials(secretKey);
        res.json({ success: true, message: "Stripe configurada com sucesso." });
    } catch (err) {
        res.status(401).json({ error: err.message });
    }
});

router.post('/stripe/create-session', async (req, res) => {
    try {
        const { group, ownerEmail, successUrl, cancelUrl } = req.body;
        const owner = await dbManager.users.findByEmail(ownerEmail);
        let config = null;
        if (owner?.paymentConfigs?.stripe) config = owner.paymentConfigs.stripe;
        else if (owner?.paymentConfig?.providerId === 'stripe') config = owner.paymentConfig;
        if (!config || !config.isConnected) return res.status(400).json({ error: "Recebedor Stripe não configurado." });
        const session = await stripeService.createCheckoutSession(config.clientSecret, group, ownerEmail, successUrl, cancelUrl);
        res.json(session);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/stripe/check-status', async (req, res) => {
    try {
        const { sessionId, ownerEmail } = req.body;
        const owner = await dbManager.users.findByEmail(ownerEmail);
        let config = null;
        if (owner?.paymentConfigs?.stripe) config = owner.paymentConfigs.stripe;
        else if (owner?.paymentConfig?.providerId === 'stripe') config = owner.paymentConfig;
        if (!config || !config.isConnected) return res.status(400).json({ error: "Configuração da Stripe não encontrada." });
        const result = await stripeService.checkSessionStatus(config.clientSecret, sessionId);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Auth Routes ---
router.get('/auth/config', (req, res) => {
    res.json({ clientId: googleAuthConfig.clientId });
});

router.post('/auth/register', async (req, res) => {
    try {
        const user = req.body;
        if (user.referredById === "") user.referredById = null;
        const userId = await dbManager.users.create(user);
        res.json({ success: true, user: { ...user, id: userId } });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await dbManager.users.findByEmail(email);
        if (user && user.password === password) {
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            const ua = req.headers['user-agent'];
            await dbManager.admin.recordIp(user.id, ip, ua);
            res.json({ user, token: 'session_' + crypto.randomUUID() });
        } else {
            res.status(401).json({ error: 'Credenciais inválidas' });
        }
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/auth/google', async (req, res) => {
    try {
        const { googleToken, referredBy } = req.body;
        let googleId, email, name;
        if (googleAuthConfig.clientId !== "GOOGLE_CLIENT_ID_NAO_CONFIGURADO" && googleToken && googleToken.length > 50) {
            try {
                const ticket = await client.verifyIdToken({ idToken: googleToken, audience: googleAuthConfig.clientId });
                const payload = ticket.getPayload();
                googleId = payload['sub']; email = payload['email']; name = payload['name'];
            } catch (err) {}
        }
        if (!googleId) {
            googleId = `mock_${crypto.randomUUID().substring(0, 8)}`;
            email = `guest_${googleId}@gmail.com`;
        }
        let user = await dbManager.users.findByGoogleId(googleId);
        let isNew = false;
        if (!user) {
            const existingByEmail = await dbManager.users.findByEmail(email);
            if (existingByEmail) {
                user = existingByEmail; user.googleId = googleId; await dbManager.users.update(user);
            } else {
                isNew = true;
                const newUser = { email, googleId, isVerified: true, isProfileCompleted: false, referredById: referredBy || null, profile: { name: `user_${googleId.slice(-4)}`, nickname: name || 'Usuário Flux', isPrivate: false, photoUrl: '' } };
                const id = await dbManager.users.create(newUser);
                user = { ...newUser, id };
            }
        }
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const ua = req.headers['user-agent'];
        await dbManager.admin.recordIp(user.id, ip, ua);
        res.json({ user, token: 'g_session_' + crypto.randomUUID(), isNew });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Group Routes ---
router.get('/groups', async (req, res) => {
    try {
        const groups = await dbManager.groups.list();
        res.json({ data: groups });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/groups/ranking', async (req, res) => {
    try {
        const { type } = req.query;
        const groups = await dbManager.groups.ranking(type);
        res.json({ data: groups });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/groups/:id', async (req, res) => {
    try {
        const group = await dbManager.groups.findById(req.params.id);
        if (!group) return res.status(404).json({ error: 'Grupo não encontrado' });
        res.json({ group });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/groups/create', async (req, res) => {
    try {
        await dbManager.groups.create(req.body);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/groups/:id', async (req, res) => {
    try {
        await dbManager.groups.update(req.body);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/groups/:id', async (req, res) => {
    try {
        await dbManager.groups.delete(req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Message & Chat Routes ---
router.get('/messages/private', async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) return res.status(400).json({ error: "Email é obrigatório." });
        const chats = await dbManager.chats.findPrivate(email);
        res.json({ chats });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/messages/groups/:id', async (req, res) => {
    try {
        const chat = await dbManager.chats.findById(req.params.id);
        if (!chat) return res.json({ messages: [] });
        res.json({ messages: chat.messages || [] });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/messages/send', async (req, res) => {
    try {
        const { chatId, message } = req.body;
        if (!chatId || !message) return res.status(400).json({ error: "chatId e message são obrigatórios." });
        
        let chatData = await dbManager.chats.findById(chatId);
        
        if (chatData) {
            chatData.messages.push(message);
        } else {
            chatData = { 
                id: chatId, 
                contactName: message.senderName || 'Desconhecido', 
                isBlocked: false, 
                messages: [message] 
            };
        }

        await dbManager.chats.set(chatData);

        if (!chatId.includes('@')) {
            await dbManager.groups.updateActivity(chatId);
        }

        if (req.io) {
            req.io.to(chatId).emit('new_message', { chatId, message });
        }

        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/messages/private/:chatId', async (req, res) => {
    try {
        await dbManager.chats.delete(req.params.chatId);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/messages/groups/:id/hide', async (req, res) => {
    try {
        const { messageId, userEmail } = req.body;
        res.json({ success: true, hiddenId: messageId });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- User & Search Routes ---
router.get('/users/sync', async (req, res) => {
    try {
        const users = await dbManager.users.getAll();
        res.json({ users });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/users/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json([]);
        const users = await dbManager.users.getAll();
        const filtered = users.filter(u => 
            u.profile?.name?.toLowerCase().includes(q.toLowerCase()) || 
            u.profile?.nickname?.toLowerCase().includes(q.toLowerCase())
        );
        res.json(filtered);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/users/update', async (req, res) => {
    try {
        const { email, updates } = req.body;
        const user = await dbManager.users.findByEmail(email);
        if (user) {
            const updated = { ...user, ...updates };
            await dbManager.users.update(updated);
            res.json({ user: updated });
        } else res.status(404).json({ error: 'Usuário não encontrado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Relationship Routes ---
router.post('/relationships/follow', async (req, res) => {
    try {
        await dbManager.relationships.create(req.body);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/relationships/unfollow', async (req, res) => {
    try {
        await dbManager.relationships.delete(req.body.followerId, req.body.followingId);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/relationships/me', async (req, res) => {
    try {
        const { followerId } = req.query;
        if (!followerId) return res.status(400).json({ error: "followerId é obrigatório" });
        const rels = await dbManager.relationships.findByFollower(followerId);
        res.json({ relationships: rels });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/rankings/top', async (req, res) => {
    try {
        const top = await dbManager.relationships.getTopCreators();
        res.json({ data: top });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
