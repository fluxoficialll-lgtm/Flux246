
import { User, Post, Group, NotificationItem, Relationship, ChatData, VerificationSession, LockoutState, VipAccess, MarketplaceItem, AdCampaign } from '../types';

// --- Constants ---
const STORAGE_KEY_SESSION_ID = 'app_current_user_id';
const STORAGE_KEY_SESSION_EMAIL = 'app_current_user_email'; // Mantido para compatibilidade legado mas depreciado
const STORAGE_KEY_SESSIONS = 'app_verification_sessions';
const STORAGE_KEY_LOCKOUTS = 'app_lockouts';

type TableName = 'users' | 'posts' | 'groups' | 'chats' | 'notifications' | 'relationships' | 'vip_access' | 'profile' | 'marketplace' | 'ads';
type Listener = () => void;

/**
 * MemoryDB: In-Memory Storage
 * Padronizado para usar o campo 'id' como chave primária de indexação universal.
 */
class MemoryDB {
    private tables: Map<string, Map<string, any>>;
    private listeners: Map<string, Set<Listener>>;

    constructor() {
        this.tables = new Map();
        this.listeners = new Map();
        
        const tableNames: TableName[] = ['users', 'posts', 'groups', 'chats', 'notifications', 'relationships', 'vip_access', 'profile', 'marketplace', 'ads'];
        tableNames.forEach(t => this.tables.set(t, new Map()));
    }

    public subscribe(table: TableName | 'all', callback: Listener) {
        if (!this.listeners.has(table)) {
            this.listeners.set(table, new Set());
        }
        this.listeners.get(table)!.add(callback);
        return () => {
            const set = this.listeners.get(table);
            if (set) set.delete(callback);
        };
    }

    private notify(table: string) {
        if (this.listeners.has(table)) {
            this.listeners.get(table)!.forEach(cb => cb());
        }
        if (this.listeners.has('all')) {
            this.listeners.get('all')!.forEach(cb => cb());
        }
    }

    public set(table: TableName, id: string | number, data: any) {
        if (!this.tables.has(table)) this.tables.set(table, new Map());
        this.tables.get(table)!.set(String(id), data);
        this.notify(table);
    }

    public get(table: TableName, id: string | number) {
        return this.tables.get(table)?.get(String(id));
    }

    public getAll<T>(table: TableName): T[] {
        if (!this.tables.has(table)) return [];
        return Array.from(this.tables.get(table)!.values());
    }

    public delete(table: TableName, id: string | number) {
        if (this.tables.get(table)?.delete(String(id))) {
            this.notify(table);
        }
    }

    public getCursorPaginated<T extends { timestamp: number }>(table: TableName, limit: number, cursor?: number): T[] {
        let items = this.getAll<T>(table);
        items.sort((a, b) => b.timestamp - a.timestamp);
        if (cursor) {
            items = items.filter(i => i.timestamp < cursor);
        }
        return items.slice(0, limit);
    }
}

const memory = new MemoryDB();

export const db = {
    refresh: async () => {},
    subscribe: (table: TableName | 'all', callback: Listener) => memory.subscribe(table, callback),

    users: {
        getAll: (limit: number = 100) => {
            const users = memory.getAll<User>('users');
            const limited = users.slice(0, limit);
            return limited.reduce((acc, user) => { acc[user.id] = user; return acc; }, {} as Record<string, User>);
        },
        saveAll: (data: Record<string, User>) => { Object.values(data).forEach(u => memory.set('users', u.id, u)); },
        get: (id: string) => memory.get('users', id),
        getByEmail: (email: string) => memory.getAll<User>('users').find(u => u.email === email),
        set: (user: User) => memory.set('users', user.id, user),
        exists: (id: string) => !!memory.get('users', id)
    },
    
    posts: {
        getAll: () => memory.getAll<Post>('posts'),
        getCursorPaginated: (limit: number, cursor?: number) => memory.getCursorPaginated<Post>('posts', limit, cursor),
        saveAll: (data: Post[]) => { data.forEach(p => memory.set('posts', p.id, p)); },
        add: (post: Post) => memory.set('posts', post.id, post),
        update: (post: Post) => memory.set('posts', post.id, post),
        delete: (id: string) => memory.delete('posts', id),
        findById: (id: string) => memory.get('posts', id)
    },

    groups: {
        getAll: () => memory.getAll<Group>('groups'),
        saveAll: (data: Group[]) => { data.forEach(g => memory.set('groups', g.id, g)); },
        add: (group: Group) => memory.set('groups', group.id, group),
        update: (group: Group) => memory.set('groups', group.id, group),
        delete: (id: string) => memory.delete('groups', id),
        findById: (id: string) => memory.get('groups', id)
    },

    chats: {
        getAll: () => {
            const chats = memory.getAll<ChatData>('chats');
            return chats.reduce((acc, c) => { acc[c.id] = c; return acc; }, {} as Record<string, ChatData>);
        },
        saveAll: (data: Record<string, ChatData>) => { Object.values(data).forEach(c => memory.set('chats', c.id, c)); },
        get: (id: string) => memory.get('chats', id),
        set: (chat: ChatData) => memory.set('chats', chat.id, chat)
    },

    notifications: {
        getAll: () => memory.getAll<NotificationItem>('notifications'),
        saveAll: (data: NotificationItem[]) => { data.forEach(n => memory.set('notifications', n.id, n)); },
        add: (item: NotificationItem) => memory.set('notifications', item.id, item),
        delete: (id: number) => memory.delete('notifications', id)
    },

    relationships: {
        getAll: () => memory.getAll<Relationship>('relationships'),
        saveAll: (data: Relationship[]) => { data.forEach(r => memory.set('relationships', `${r.followerId}_${r.followingId}`, r)); },
        add: (rel: Relationship) => memory.set('relationships', `${rel.followerId}_${rel.followingId}`, rel),
        remove: (followerId: string, followingId: string) => memory.delete('relationships', `${followerId}_${followingId}`)
    },

    vipAccess: {
        grant: (access: VipAccess) => memory.set('vip_access', `${access.userId}_${access.groupId}`, access),
        check: (userId: string, groupId: string) => {
            const access = memory.get('vip_access', `${userId}_${groupId}`);
            return access?.status === 'active';
        },
        get: (userId: string, groupId: string) => memory.get('vip_access', `${userId}_${groupId}`)
    },

    marketplace: {
        getAll: () => memory.getAll<MarketplaceItem>('marketplace'),
        add: (item: MarketplaceItem) => memory.set('marketplace', item.id, item),
        delete: (id: string) => memory.delete('marketplace', id)
    },

    ads: {
        getAll: () => memory.getAll<AdCampaign>('ads'),
        add: (ad: AdCampaign) => memory.set('ads', ad.id, ad),
        update: (ad: AdCampaign) => memory.set('ads', ad.id, ad),
        delete: (id: string) => memory.delete('ads', id)
    },

    profile: {
        get: (id: string) => memory.get('profile', id),
        update: (id: string, profile: any) => memory.set('profile', id, profile),
        isAnalysisEnabled: (id: string) => memory.get('profile', `${id}_permissions`)?.analysis_enabled,
        setAnalysisEnabled: (id: string, enabled: boolean) => memory.set('profile', `${id}_permissions`, { analysis_enabled: enabled })
    },

    auth: {
        currentUserId: (): string | null => localStorage.getItem(STORAGE_KEY_SESSION_ID),
        setCurrentUserId: (id: string) => localStorage.setItem(STORAGE_KEY_SESSION_ID, id),
        clearSession: () => {
            localStorage.removeItem(STORAGE_KEY_SESSION_ID);
            localStorage.removeItem(STORAGE_KEY_SESSION_EMAIL);
        },
        getSession: (email: string): VerificationSession | null => { try { const data = JSON.parse(localStorage.getItem(STORAGE_KEY_SESSIONS) || '{}'); return data[email] || null; } catch { return null; } },
        saveSession: (email: string, session: VerificationSession) => { const data = JSON.parse(localStorage.getItem(STORAGE_KEY_SESSIONS) || '{}'); data[email] = session; localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(data)); },
        getLockout: (email: string): LockoutState => { try { const data = JSON.parse(localStorage.getItem(STORAGE_KEY_LOCKOUTS) || '{}'); return data[email] || { attempts: 0, blockedUntil: null }; } catch { return { attempts: 0, blockedUntil: null }; } },
        saveLockout: (email: string, state: LockoutState) => { const data = JSON.parse(localStorage.getItem(STORAGE_KEY_LOCKOUTS) || '{}'); data[email] = state; localStorage.setItem(STORAGE_KEY_LOCKOUTS, JSON.stringify(data)); }
    }
};
