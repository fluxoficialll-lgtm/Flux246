
import { db } from '@/database';
import { ChatMessage, ChatData } from '../types';
import { authService } from './authService';
import { API_BASE } from '../apiConfig';

const API_URL = `${API_BASE}/api/messages`;

export type { ChatMessage, ChatData };

export const chatService = {
    getAllChats: () => {
        const all = db.chats.getAll();
        // Retorna apenas chats privados (contém @ no ID)
        return Object.values(all).filter(chat => chat.id.toString().includes('@'));
    },

    /**
     * Sincronização inteligente de chats privados (1v1)
     */
    syncChats: async () => {
        const email = authService.getCurrentUserEmail();
        if (!email) return;
        try {
            // Usa o novo endpoint especializado para chats privados
            const res = await fetch(`${API_URL}/private?email=${encodeURIComponent(email)}`);
            if (res.ok) {
                const data = await res.json();
                data.chats?.forEach((c: any) => {
                    if (c.id.toString().includes('@')) {
                        db.chats.set(c);
                    }
                });
            }
        } catch (e) {
            console.warn("Chat sync failed");
        }
    },

    getPrivateChatId: (id1: string, id2: string) => [id1.toLowerCase(), id2.toLowerCase()].sort().join('_'),

    getChat: (id: string): ChatData => {
        let chat = db.chats.get(id);
        if (!chat) {
            chat = { id, contactName: id.includes('@') ? 'Chat' : 'Grupo', isBlocked: false, messages: [] };
            db.chats.set(chat);
        }
        return chat;
    },

    /**
     * Busca histórico específico do chat (Grupo ou Privado)
     */
    fetchChatMessages: async (chatId: string, limit: number = 50, beforeId?: number) => {
        try {
            const isGroup = !chatId.includes('@');
            const url = isGroup 
                ? `${API_URL}/groups/${chatId}?limit=${limit}&before=${beforeId || ''}`
                : `${API_URL}/private/${chatId}?limit=${limit}&before=${beforeId || ''}`;

            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                if (data.messages) {
                    const chat = db.chats.get(chatId) || { id: chatId, contactName: isGroup ? 'Grupo' : 'Chat', isBlocked: false, messages: [] };
                    chat.messages = [...(chat.messages || []), ...data.messages].sort((a, b) => a.id - b.id);
                    db.chats.set(chat);
                }
            }
        } catch (e) {
            console.warn("Failed to fetch messages from server");
        }
    },

    sendMessage: async (chatId: string, message: ChatMessage) => {
        const userId = authService.getCurrentUserId();
        if (userId) message.senderId = userId;
        
        // Update local state immediately (Optimistic UI)
        const chat = db.chats.get(chatId);
        if (chat) {
            chat.messages.push(message);
            db.chats.set(chat);
        }

        // Send to server
        try {
            await fetch(`${API_URL}/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatId, message })
            });
        } catch (e) {
            console.error("Failed to send message to server");
        }
    },

    getUnreadCount: () => {
        const userId = authService.getCurrentUserId()?.toLowerCase();
        if (!userId) return 0;

        return Object.values(db.chats.getAll()).reduce((acc, chat) => {
            if (!chat.id.toString().includes('@')) return acc;
            return acc + chat.messages.filter(m => {
                const sender = (m.senderEmail || m.senderId || '').toLowerCase();
                return sender !== userId && m.status !== 'read';
            }).length;
        }, 0);
    },

    getGroupUnreadCount: (groupId: string) => {
        const chat = db.chats.get(groupId);
        const userId = authService.getCurrentUserId()?.toLowerCase();
        if (!userId || !chat) return 0;
        
        return chat.messages.filter(m => {
            const sender = (m.senderEmail || m.senderId || '').toLowerCase();
            return sender !== userId && m.status !== 'read';
        }).length;
    },

    markChatAsRead: (chatId: string) => {
        const chat = db.chats.get(chatId);
        const userId = authService.getCurrentUserId()?.toLowerCase();
        if (chat && userId) {
            chat.messages.forEach(m => { 
                const sender = (m.senderEmail || m.senderId || '').toLowerCase();
                if(sender !== userId) m.status = 'read'; 
            });
            db.chats.set(chat);
        }
    },

    toggleBlock: (chatId: string): boolean => {
        const chat = db.chats.get(chatId);
        if (chat) {
            chat.isBlocked = !chat.isBlocked;
            db.chats.set(chat);
            return chat.isBlocked;
        }
        return false;
    },

    /**
     * Diferencia exclusão privada de ocultação em grupo
     */
    deleteMessages: async (chatId: string, messageIds: number[], target: 'me' | 'all' = 'me') => {
        const isGroup = !chatId.includes('@');
        const userEmail = authService.getCurrentUserEmail();

        if (isGroup) {
            // Lógica de Grupo: Ocultar para o usuário
            try {
                await fetch(`${API_URL}/groups/${chatId}/hide`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ messageIds, userEmail })
                });
            } catch (e) { console.error("Hide failed"); }
        } else {
            // Lógica Privada: Deletar físicamente (Endpoint DELETE)
            try {
                await fetch(`${API_URL}/private/${chatId}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ messageIds, target })
                });
            } catch (e) { console.error("Delete failed"); }
        }

        // Atualização local
        const chat = db.chats.get(chatId);
        if (chat) {
            chat.messages = chat.messages.filter(m => !messageIds.includes(m.id));
            db.chats.set(chat);
        }
    },

    clearChat: (chatId: string) => {
        const chat = db.chats.get(chatId);
        if (chat) {
            chat.messages = [];
            db.chats.set(chat);
        }
    },

    markAllAsRead: () => {
        const userId = authService.getCurrentUserId()?.toLowerCase();
        if (!userId) return;

        const allChats = db.chats.getAll();
        Object.values(allChats).forEach(chat => {
            if (chat.id.toString().includes('@')) {
                chat.messages.forEach(m => { 
                    const sender = (m.senderEmail || m.senderId || '').toLowerCase();
                    if(sender !== userId) m.status = 'read'; 
                });
                db.chats.set(chat);
            }
        });
    },

    hasBlockingRelationship: (userId1: string, userId2: string): boolean => {
        const chatId = chatService.getPrivateChatId(userId1, userId2);
        const chat = db.chats.get(chatId);
        return chat?.isBlocked || false;
    },

    toggleBlockByContactName: (name: string): boolean => {
        const cleanName = name.replace('@', '').toLowerCase();
        const allChats = db.chats.getAll();
        const chat = Object.values(allChats).find(c => c.contactName.toLowerCase() === cleanName);
        if (chat) {
            chat.isBlocked = !chat.isBlocked;
            db.chats.set(chat);
            return chat.isBlocked;
        }
        return false;
    },

    getBlockedIdentifiers: (userEmail: string): Set<string> => {
        const allChats = db.chats.getAll();
        const blocked = new Set<string>();
        Object.values(allChats).forEach(chat => {
            if (chat.isBlocked) {
                blocked.add(chat.contactName);
            }
        });
        return blocked;
    }
};
