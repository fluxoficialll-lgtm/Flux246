
import { User, AuthError, UserProfile, NotificationSettings, SecuritySettings, UserSession, PaymentProviderConfig } from '../types';
import { emailService } from './emailService';
import { cryptoService } from './cryptoService';
import { API_BASE } from '../apiConfig';
import { db } from '@/database';
import { trackingService } from './trackingService';

const API_URL = `${API_BASE}/api/auth`;
const API_USERS = `${API_BASE}/api/users`;

const safeFetch = async (url: string, options: RequestInit) => {
    try {
        const response = await fetch(url, options);
        const contentType = response.headers.get("content-type");
        
        if (contentType && contentType.includes("application/json")) {
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || `Erro ${response.status}: ${response.statusText}`);
            }
            return data;
        } else {
            const text = await response.text();
            console.error(`[AuthService] Resposta não-JSON de ${url} (${response.status}):`, text.substring(0, 200));
            if (response.status === 404) throw new Error("Serviço de autenticação não encontrado.");
            throw new Error("Resposta inválida do servidor.");
        }
    } catch (e: any) {
        throw e;
    }
};

export const authService = {
  isValidEmail: (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),

  syncRemoteUsers: async () => {
      const currentUserId = authService.getCurrentUserId();
      try {
          const data = await safeFetch(`${API_USERS}/sync`, { method: 'GET' });
          if (data && Array.isArray(data.users)) {
              data.users.forEach((user: User) => {
                  if (currentUserId && user.id === currentUserId) return;
                  db.users.set(user);
              });
          }
      } catch (e) { console.warn("⚠️ [Sync] Falha ao sincronizar usuários."); }
  },

  performLoginSync: async (user: User) => {
      const { groupService } = await import('./groupService');
      const { chatService } = await import('./chatService');
      const { relationshipService } = await import('./relationshipService');
      
      // Armazenamento unificado por ID imutável
      db.users.set(user);
      localStorage.setItem('cached_user_profile', JSON.stringify(user));
      localStorage.setItem('user_id', user.id); 
      db.auth.setCurrentUserId(user.id);
      
      await groupService.fetchGroups();
      await chatService.syncChats();
      await relationshipService.syncRelationships(); // Sincroniza quem eu sigo
      authService.syncRemoteUsers();
  },

  login: async (email: string, password: string): Promise<{ user: User; nextStep: string }> => {
    const normalizedEmail = email.toLowerCase().trim();
    const hashedPassword = await cryptoService.hashPassword(password);
    
    const data = await safeFetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password: hashedPassword })
    });

    localStorage.setItem('auth_token', data.token);
    await authService.performLoginSync(data.user);
    
    if (data.user.isBanned) return { user: data.user, nextStep: '/banned' };

    return { 
        user: data.user, 
        nextStep: !data.user.isProfileCompleted ? '/complete-profile' : '/feed' 
    };
  },

  loginWithGoogle: async (googleToken?: string, referredById?: string): Promise<{ user: User; nextStep: string }> => {
      const data = await safeFetch(`${API_URL}/google`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ googleToken, referredBy: referredById || null }) 
      });
      
      localStorage.setItem('auth_token', data.token);
      await authService.performLoginSync(data.user);
      
      if (data.user.isBanned) return { user: data.user, nextStep: '/banned' };

      const isNew = data.isNew || !data.user.isProfileCompleted;
      return { 
          user: data.user, 
          nextStep: isNew ? '/complete-profile' : '/feed' 
      };
  },

  register: async (email: string, password: string, referredById?: string) => {
    const normalizedEmail = email.toLowerCase().trim();
    const hashedPassword = await cryptoService.hashPassword(password);
    const finalReferrerId = referredById || trackingService.getAffiliateRefId();

    localStorage.setItem('temp_register_email', normalizedEmail);
    localStorage.setItem('temp_register_pw', hashedPassword);
    if (finalReferrerId) localStorage.setItem('temp_referred_by_id', finalReferrerId);
    
    await authService.sendVerificationCode(normalizedEmail);
  },

  verifyCode: async (email: string, code: string, isResetFlow: boolean = false) => {
    const normalizedEmail = email.toLowerCase().trim();
    const sessionStr = localStorage.getItem(`verify_${normalizedEmail}`);
    const session = sessionStr ? JSON.parse(sessionStr) : null;
    
    if (!session || Date.now() > session.expiresAt) throw new Error(AuthError.CODE_EXPIRED);
    if (session.code !== code) throw new Error(AuthError.CODE_INVALID);
    
    if (!isResetFlow) {
        const passwordHash = localStorage.getItem('temp_register_pw');
        const referredById = localStorage.getItem('temp_referred_by_id');
        
        const data = await safeFetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: normalizedEmail, 
                password: passwordHash, 
                isVerified: true, 
                isProfileCompleted: false,
                referredById: referredById || undefined,
                profile: { 
                    name: normalizedEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, ''), 
                    nickname: 'Novo Usuário', 
                    isPrivate: false 
                }
            })
        });
        
        await authService.performLoginSync(data.user);
        localStorage.setItem('auth_token', data.token);
        trackingService.clear(); 
    }
    return true;
  },

  sendVerificationCode: async (email: string, type: 'register' | 'reset' = 'register') => {
    const normalizedEmail = email.toLowerCase().trim();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const session = { code, expiresAt: Date.now() + 15 * 60 * 1000, attempts: 0 };
    localStorage.setItem(`verify_${normalizedEmail}`, JSON.stringify(session));
    await emailService.sendVerificationCode(normalizedEmail, code, type);
  },

  completeProfile: async (email: string, data: UserProfile) => {
      const result = await safeFetch(`${API_USERS}/update`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.toLowerCase().trim(), updates: { profile: data, isProfileCompleted: true } })
      });
      
      db.users.set(result.user);
      localStorage.setItem('cached_user_profile', JSON.stringify(result.user));
      return result.user;
  },

  getCurrentUserId: () => localStorage.getItem('user_id') || db.auth.currentUserId(),
  getCurrentUserEmail: () => {
      const user = authService.getCurrentUser();
      return user ? user.email : null;
  },
  getCurrentUser: (): User | null => { 
      const cached = localStorage.getItem('cached_user_profile'); 
      return cached ? JSON.parse(cached) : null; 
  },
  getAllUsers: (): User[] => Object.values(db.users.getAll()),
  
  searchUsers: async (query: string): Promise<User[]> => {
      try {
          const data = await safeFetch(`${API_USERS}/search?q=${encodeURIComponent(query)}`, { method: 'GET' });
          return data || [];
      } catch (e) { return []; }
  },

  fetchUserByHandle: async (handle: string, fallbackEmail?: string): Promise<User | undefined> => {
      if (!handle) return undefined;
      const clean = handle.replace('@', '').toLowerCase().trim();
      try {
          const users = await authService.searchUsers(clean);
          const found = users.find((u: any) => u.profile?.name === clean);
          if (found) {
              db.users.set(found); // Cache locally for consistency
          }
          return found;
      } catch (e) { return undefined; }
  },

  getUserByHandle: (handle: string): User | undefined => {
      if (!handle) return undefined;
      const clean = handle.replace('@', '').toLowerCase().trim();
      return Object.values(db.users.getAll()).find(u => u.profile?.name === clean);
  },

  logout: () => { 
      localStorage.removeItem('user_id');
      localStorage.removeItem('auth_token'); 
      localStorage.removeItem('cached_user_profile'); 
      db.auth.clearSession();
      sessionStorage.clear();
      trackingService.hardReset(); 
  },

  updatePaymentConfig: async (config: PaymentProviderConfig) => {
      const user = authService.getCurrentUser();
      if (user) {
          user.paymentConfig = config;
          db.users.set(user);
          localStorage.setItem('cached_user_profile', JSON.stringify(user));
          await safeFetch(`${API_USERS}/update`, { 
              method: 'PUT', headers: { 'Content-Type': 'application/json' }, 
              body: JSON.stringify({ email: user.email, updates: { paymentConfig: config } }) 
          }); 
      }
  },

  updateHeartbeat: () => { 
      const user = authService.getCurrentUser(); 
      if (user) { user.lastSeen = Date.now(); db.users.set(user); } 
  },

  checkUsernameAvailability: async (name: string): Promise<boolean> => {
      const results = await authService.searchUsers(name);
      return !results.some(u => u.profile?.name === name.toLowerCase());
  },

  updateNotificationSettings: async (settings: NotificationSettings) => {
      const user = authService.getCurrentUser();
      if (user) {
          user.notificationSettings = settings;
          db.users.set(user);
          localStorage.setItem('cached_user_profile', JSON.stringify(user));
          await safeFetch(`${API_USERS}/update`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: user.email, updates: { notificationSettings: settings } })
          });
      }
  },

  resetPassword: async (email: string, password: string) => {
    const normalizedEmail = email.toLowerCase().trim();
    const hashedPassword = await cryptoService.hashPassword(password);
    
    return await safeFetch(`${API_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password: hashedPassword })
    });
  },

  getUserSessions: (): UserSession[] => {
      const user = authService.getCurrentUser();
      return user?.sessions || [];
  },

  updateSecuritySettings: async (settings: SecuritySettings) => {
      const user = authService.getCurrentUser();
      if (user) {
          user.securitySettings = settings;
          db.users.set(user);
          localStorage.setItem('cached_user_profile', JSON.stringify(user));
          await safeFetch(`${API_USERS}/update`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: user.email, updates: { securitySettings: settings } })
          });
      }
  },

  changePassword: async (current: string, newPw: string) => {
      const user = authService.getCurrentUser();
      if (!user) throw new Error("Não autenticado");
      
      const hashedCurrent = await cryptoService.hashPassword(current);
      const hashedNew = await cryptoService.hashPassword(newPw);
      
      return await safeFetch(`${API_URL}/change-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
              email: user.email, 
              currentPassword: hashedCurrent, 
              newPassword: hashedNew 
          })
      });
  },

  revokeOtherSessions: async () => {
      const user = authService.getCurrentUser();
      if (!user) return;
      
      await safeFetch(`${API_URL}/sessions/revoke-others`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email })
      });
      
      if (user.sessions) {
          user.sessions = user.sessions.filter(s => s.isActive);
          db.users.set(user);
          localStorage.setItem('cached_user_profile', JSON.stringify(user));
      }
  }
};
