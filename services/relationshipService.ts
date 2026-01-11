
import { Relationship, User } from '../types';
import { authService } from './authService';
import { db } from '@/database';
import { API_BASE } from '../apiConfig';

const API_URL = `${API_BASE}/api/relationships`;

export const relationshipService = {
  /**
   * Sincroniza os relacionamentos do usuário logado com o servidor.
   */
  syncRelationships: async () => {
    const currentId = authService.getCurrentUserId();
    if (!currentId) return;

    try {
        const response = await fetch(`${API_URL}/me?followerId=${encodeURIComponent(currentId)}`);
        if (response.ok) {
            const data = await response.json();
            if (data.relationships && Array.isArray(data.relationships)) {
                data.relationships.forEach((rel: Relationship) => {
                    db.relationships.add(rel);
                });
            }
        }
    } catch (e) {
        console.warn("⚠️ [Relationship] Falha ao sincronizar relacionamentos.");
    }
  },

  followUser: async (targetHandle: string): Promise<'following' | 'requested'> => {
    const currentId = authService.getCurrentUserId();
    if (!currentId) throw new Error("Você precisa estar logado.");

    const cleanHandle = targetHandle.replace('@', '').toLowerCase().trim();
    
    // Tenta encontrar o usuário alvo
    let targetUser = authService.getUserByHandle(cleanHandle);
    if (!targetUser) {
        targetUser = await authService.fetchUserByHandle(cleanHandle);
    }

    if (!targetUser) throw new Error("Usuário não encontrado no sistema.");

    try {
        const response = await fetch(`${API_URL}/follow`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                followerId: currentId, 
                followingId: targetUser.id,
                status: 'accepted'
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || "Falha ao seguir usuário no servidor.");
        }

        const rel: Relationship = { 
            followerId: currentId, 
            followingId: targetUser.id, 
            followingUsername: `@${cleanHandle}`, 
            status: 'accepted' 
        };
        
        db.relationships.add(rel);
        return 'following';
    } catch (e: any) {
        console.error("[RelationshipService] Follow error:", e);
        throw e;
    }
  },

  unfollowUser: async (targetHandle: string) => {
    const currentId = authService.getCurrentUserId();
    if (!currentId) return;

    const cleanHandle = targetHandle.replace('@', '').toLowerCase().trim();
    
    let targetUser = authService.getUserByHandle(cleanHandle);
    if (!targetUser) {
        targetUser = await authService.fetchUserByHandle(cleanHandle);
    }
    
    if (!targetUser) return;
    
    try {
        const response = await fetch(`${API_URL}/unfollow`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ followerId: currentId, followingId: targetUser.id })
        });

        if (!response.ok) throw new Error("Erro ao deixar de seguir.");
        
        db.relationships.remove(currentId, targetUser.id);
    } catch (e) {
        console.error("[RelationshipService] Unfollow error:", e);
        throw e;
    }
  },

  isFollowing: (targetHandleOrId: string): 'none' | 'following' | 'requested' => {
    const currentId = authService.getCurrentUserId();
    if (!currentId) return 'none';

    const term = targetHandleOrId.replace('@', '').toLowerCase().trim();
    const allRels = db.relationships.getAll();
    
    const rel = allRels.find(r => 
        String(r.followerId) === String(currentId) && 
        (
            String(r.followingId) === String(targetHandleOrId) ||
            r.followingUsername?.toLowerCase().replace('@', '') === term
        )
    );
    
    if (rel) return rel.status === 'accepted' ? 'following' : 'requested';
    return 'none';
  },

  getFollowers: (handle: string) => {
    const cleanHandle = handle.replace('@', '').toLowerCase();
    const targetUser = authService.getUserByHandle(cleanHandle);
    if (!targetUser) return [];
    
    const rels = db.relationships.getAll().filter(r => 
        String(r.followingId) === String(targetUser.id) && 
        r.status === 'accepted'
    );
    
    const allUsers = db.users.getAll();
    return rels.map(r => {
        const u = Object.values(allUsers).find(user => user.id === r.followerId);
        return { 
            name: u?.profile?.nickname || u?.profile?.name || 'User', 
            username: u?.profile?.name || 'user', 
            avatar: u?.profile?.photoUrl 
        };
    });
  },

  getFollowing: (userId: string) => {
    const rels = db.relationships.getAll().filter(r => 
        String(r.followerId) === String(userId) && 
        r.status === 'accepted'
    );
    
    const allUsers = db.users.getAll();
    return rels.map(r => {
        const u = Object.values(allUsers).find(user => user.id === r.followingId);
        return { 
            name: u?.profile?.nickname || u?.profile?.name || 'User', 
            username: u?.profile?.name || 'user', 
            avatar: u?.profile?.photoUrl 
        };
    });
  },

  getMutualFriends: async () => {
      const userId = authService.getCurrentUserId();
      if (!userId) return [];
      
      const allRels = db.relationships.getAll();
      const followingIds = allRels
          .filter(r => String(r.followerId) === String(userId) && r.status === 'accepted')
          .map(r => r.followingId);
          
      const followerIds = allRels
          .filter(r => String(r.followingId) === String(userId) && r.status === 'accepted')
          .map(r => r.followerId);
          
      const mutualIds = followingIds.filter(id => followerIds.includes(id));
      
      const allUsers = db.users.getAll();
      return mutualIds.map(id => {
          const u = Object.values(allUsers).find(user => user.id === id);
          return { 
              id, 
              name: u?.profile?.nickname || u?.profile?.name || '', 
              username: u?.profile?.name || '', 
              avatar: u?.profile?.photoUrl || '' 
          };
      });
  },

  getTopCreators: async () => {
      try {
          const res = await fetch(`${API_BASE}/api/rankings/top`);
          const data = await res.json();
          return data.data || [];
      } catch (e) {
          return [];
      }
  },

  acceptFollowRequest: async (targetHandle: string) => {
      const currentId = authService.getCurrentUserId();
      const cleanHandle = targetHandle.replace('@', '').toLowerCase();
      const targetUser = authService.getUserByHandle(cleanHandle);
      if (!currentId || !targetUser) return;
      
      const rel = db.relationships.getAll().find(r => 
          String(r.followerId) === String(targetUser.id) && 
          String(r.followingId) === String(currentId)
      );
      
      if (rel) {
          rel.status = 'accepted';
          db.relationships.add(rel);
          // Opcional: Persistir no servidor
      }
  },

  rejectFollowRequest: async (targetHandle: string) => {
      const currentId = authService.getCurrentUserId();
      const cleanHandle = targetHandle.replace('@', '').toLowerCase();
      const targetUser = authService.getUserByHandle(cleanHandle);
      if (!currentId || !targetUser) return;
      db.relationships.remove(targetUser.id, currentId);
  }
};
