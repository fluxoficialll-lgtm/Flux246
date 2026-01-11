
import { Group, User, GroupLink } from '../types';
import { db } from '@/database';
import { authService } from './authService';
import { API_BASE } from '../apiConfig';

const API_URL = `${API_BASE}/api/groups`;

export const groupService = {
    fetchGroups: async (): Promise<Group[]> => {
        try {
            const response = await fetch(API_URL);
            if (response.ok) {
                const data = await response.json();
                const groups = data.data || [];
                db.groups.saveAll(groups);
                return groups;
            }
        } catch (e) {
            console.error("Fetch groups failed", e);
        }
        return db.groups.getAll();
    },

    getGroupsSync: (): Group[] => db.groups.getAll().sort((a, b) => {
        const timeA = new Date(a.updated_at || a.created_at || 0).getTime();
        const timeB = new Date(b.updated_at || b.created_at || 0).getTime();
        return timeB - timeA;
    }),

    getGroupsPaginated: (offset: number, limit: number) => {
        const currentId = authService.getCurrentUserId();
        const all = db.groups.getAll();
        const myGroups = all.filter(g => 
            g.memberIds?.includes(currentId || '') || g.creatorId === currentId
        ).sort((a, b) => {
             return (b.timestamp || 0) - (a.timestamp || 0);
        });

        return { 
            groups: myGroups.slice(offset, offset + limit), 
            hasMore: offset + limit < myGroups.length 
        };
    },

    getAllGroupsForRanking: async (type: string = 'public'): Promise<Group[]> => {
        try {
            const res = await fetch(`${API_URL}/ranking?type=${type}`);
            if (res.ok) {
                const data = await res.json();
                const groups = data.data || [];
                db.groups.saveAll(groups);
                return groups;
            }
        } catch (e) {
            console.warn("Ranking fetch failed, using local cache", e);
        }
        return db.groups.getAll();
    },

    getGroupById: (id: string) => db.groups.findById(id),

    fetchGroupById: async (id: string) => {
        try {
            const res = await fetch(`${API_URL}/${id}`);
            if (res.ok) {
                const data = await res.json();
                if (data.group) {
                    db.groups.update(data.group);
                    return data.group;
                }
            }
        } catch (e) {
            console.error("Fetch specific group failed", e);
        }
        return db.groups.findById(id);
    },

    createGroup: async (group: Group) => {
        const userId = authService.getCurrentUserId();
        if (userId) group.creatorId = userId;
        
        group.updated_at = new Date().toISOString();
        db.groups.add(group);

        try {
            await fetch(`${API_URL}/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(group)
            });
        } catch (e) {
            console.error("Server group creation failed", e);
        }
    },

    updateGroup: async (group: Group) => {
        group.updated_at = new Date().toISOString();
        db.groups.update(group);
        try {
            await fetch(`${API_URL}/${group.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(group)
            });
        } catch (e) {
            console.error("Server group update failed", e);
        }
    },

    deleteGroup: async (id: string) => {
        db.groups.delete(id);
        try {
            await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        } catch (e) {
            console.error("Server group delete failed", e);
        }
    },

    joinGroup: (groupId: string): 'joined' | 'pending' | 'full' | 'banned' | 'error' => {
        const userId = authService.getCurrentUserId();
        const group = db.groups.findById(groupId);
        if (!userId || !group) return 'error';
        
        if (group.memberIds?.includes(userId)) return 'joined';
        if (group.bannedUserIds?.includes(userId)) return 'banned';
        
        if (group.settings?.memberLimit && (group.memberIds?.length || 0) >= group.settings.memberLimit) {
            return 'full';
        }

        if (group.isPrivate || group.settings?.approveMembers) {
            group.pendingMemberIds = [...(group.pendingMemberIds || []), userId];
            groupService.updateGroup(group);
            return 'pending';
        }

        group.memberIds = [...(group.memberIds || []), userId];
        groupService.updateGroup(group);
        return 'joined';
    },

    checkVipStatus: (groupId: string, userId: string): 'active' | 'none' | 'expired' | 'grace_period' => {
        const access = db.vipAccess.get(userId, groupId);
        if (!access) return 'none';
        if (access.status === 'active') {
            if (access.expiresAt && Date.now() > access.expiresAt) {
                if (Date.now() - access.expiresAt < 24 * 60 * 60 * 1000) return 'grace_period';
                return 'expired';
            }
            return 'active';
        }
        return 'none';
    },

    getGroupMembers: (groupId: string) => {
        const group = db.groups.findById(groupId);
        if (!group) return [];
        return Object.values(db.users.getAll()).filter(u => group.memberIds?.includes(u.id));
    },

    getPendingMembers: (groupId: string) => {
        const group = db.groups.findById(groupId);
        if (!group) return [];
        return Object.values(db.users.getAll()).filter(u => group.pendingMemberIds?.includes(u.id));
    },

    addGroupLink: (groupId: string, name: string, maxUses?: number, expiresAt?: string) => {
        const group = db.groups.findById(groupId);
        if (!group) return null;
        const link: GroupLink = { 
            id: Date.now().toString(), 
            name, 
            code: Math.random().toString(36).substr(2, 6).toUpperCase(), 
            joins: 0, 
            createdAt: Date.now(),
            maxUses,
            expiresAt
        };
        group.links = [link, ...(group.links || [])];
        groupService.updateGroup(group);
        return link;
    },

    removeGroupLink: (groupId: string, linkId: string) => {
        const group = db.groups.findById(groupId);
        if (group && group.links) {
            group.links = group.links.filter(l => l.id !== linkId);
            groupService.updateGroup(group);
        }
    },

    removeMember: (groupId: string, userId: string) => {
        const group = db.groups.findById(groupId);
        if (group) {
            group.memberIds = group.memberIds?.filter(id => id !== userId);
            group.adminIds = group.adminIds?.filter(id => id !== userId);
            groupService.updateGroup(group);
        }
    },

    banMember: (groupId: string, userId: string) => {
        const group = db.groups.findById(groupId);
        if (group) {
            group.memberIds = group.memberIds?.filter(id => id !== userId);
            group.adminIds = group.adminIds?.filter(id => id !== userId);
            group.bannedUserIds = [...(group.bannedUserIds || []), userId];
            groupService.updateGroup(group);
        }
    },

    promoteMember: (groupId: string, userId: string) => {
        const group = db.groups.findById(groupId);
        if (group) {
            group.adminIds = [...(group.adminIds || []), userId];
            groupService.updateGroup(group);
        }
    },

    demoteMember: (groupId: string, userId: string) => {
        const group = db.groups.findById(groupId);
        if (group) {
            group.adminIds = group.adminIds?.filter(id => id !== userId);
            groupService.updateGroup(group);
        }
    },

    approveMember: (groupId: string, userId: string) => {
        const group = db.groups.findById(groupId);
        if (group) {
            group.pendingMemberIds = group.pendingMemberIds?.filter(id => id !== userId);
            group.memberIds = [...(group.memberIds || []), userId];
            groupService.updateGroup(group);
        }
    },

    rejectMember: (groupId: string, userId: string) => {
        const group = db.groups.findById(groupId);
        if (group) {
            group.pendingMemberIds = group.pendingMemberIds?.filter(id => id !== userId);
            groupService.updateGroup(group);
        }
    },

    leaveGroup: async (groupId: string) => {
        const userId = authService.getCurrentUserId();
        const group = db.groups.findById(groupId);
        if (!userId || !group) return;

        const isOwner = group.creatorId === userId;

        if (isOwner) {
            // Lógica de sucessão
            let candidates = (group.adminIds || []).filter(id => id !== userId);
            
            if (candidates.length === 0) {
                candidates = (group.memberIds || []).filter(id => id !== userId);
            }

            if (candidates.length > 0) {
                // Escolhe um sucessor aleatório
                const newOwnerId = candidates[Math.floor(Math.random() * candidates.length)];
                const newOwner = db.users.get(newOwnerId);
                
                group.creatorId = newOwnerId;
                group.creatorEmail = newOwner?.email || group.creatorEmail; // Mantém fallback se não achar email
                
                // Remove o antigo dono da lista de membros/admins
                group.memberIds = group.memberIds?.filter(id => id !== userId);
                group.adminIds = group.adminIds?.filter(id => id !== userId);
                
                groupService.updateGroup(group);
            } else {
                // Era a última pessoa, apaga o grupo
                await groupService.deleteGroup(groupId);
            }
        } else {
            // Saída normal de membro
            groupService.removeMember(groupId, userId);
        }
    },

    joinGroupByLinkCode: (code: string): { success: boolean; message: string; groupId?: string } => {
        const allGroups = db.groups.getAll();
        for (const g of allGroups) {
            const link = g.links?.find(l => l.code === code);
            if (link) {
                if (link.maxUses && link.joins >= link.maxUses) return { success: false, message: "Este link atingiu o limite de usos." };
                if (link.expiresAt && Date.now() > new Date(link.expiresAt).getTime()) return { success: false, message: "Este link expirou." };
                
                const res = groupService.joinGroup(g.id);
                if (res === 'joined') {
                    link.joins++;
                    groupService.updateGroup(g);
                    return { success: true, message: "Você entrou no grupo!", groupId: g.id };
                }
                return { success: false, message: "Erro ao entrar no grupo." };
            }
        }
        return { success: false, message: "Código inválido." };
    }
};
