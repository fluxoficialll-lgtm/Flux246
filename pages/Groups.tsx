import React, { useEffect, useRef, useState, useCallback, Suspense, lazy } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../services/authService';
import { groupService } from '../services/groupService';
import { chatService } from '../services/chatService';
import { notificationService } from '../services/notificationService';
import { Group } from '../types';
import { db } from '@/database';
import { useModal } from '../components/ModalSystem';
import { trackingService } from '../services/trackingService';

const TrackingModal = lazy(() => import('../components/groups/TrackingModal').then(m => ({ default: m.TrackingModal })));

export const Groups: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showAlert, showConfirm, showPrompt } = useModal();
  
  const [uiVisible, setUiVisible] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
  // Tracking State
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [selectedGroupForTracking, setSelectedGroupForTracking] = useState<Group | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const LIMIT = 10; 
  
  const lastScrollY = useRef(0);
  const observerRef = useRef<HTMLDivElement>(null);

  // Notification Badges State
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [unreadMsgs, setUnreadMsgs] = useState(0);

  const loadLocalGroups = useCallback((currentOffset: number, reset: boolean = false) => {
      const { groups: newGroups, hasMore: moreAvailable } = groupService.getGroupsPaginated(currentOffset, LIMIT);
      
      if (reset) {
          setGroups(newGroups);
          setOffset(LIMIT);
      } else {
          setGroups(prev => {
              const ids = new Set(prev.map(g => g.id));
              const unique = newGroups.filter(g => !ids.has(g.id));
              return [...prev, ...unique];
          });
          setOffset(prev => prev + LIMIT);
      }
      
      setHasMore(moreAvailable);
      setLoading(false);
  }, []);

  useEffect(() => {
    const userEmail = authService.getCurrentUserEmail();
    const userId = authService.getCurrentUserId();
    if (!userEmail) {
      navigate('/');
      return;
    }
    setCurrentUserEmail(userEmail);
    setCurrentUserId(userId);

    loadLocalGroups(0, true);
    groupService.fetchGroups();

    const params = new URLSearchParams(location.search);
    const joinCode = params.get('join');
    if (joinCode) {
        handleJoinByLink(joinCode);
        navigate('/groups', { replace: true });
    }

    const unsubscribeGroups = db.subscribe('groups', () => {
        loadLocalGroups(0, true);
    });
    
    const handleScroll = () => {
      const currentScroll = window.scrollY;
      if (currentScroll > lastScrollY.current && currentScroll > 80) {
        setUiVisible(false);
      } else {
        setUiVisible(true);
      }
      lastScrollY.current = currentScroll;
    };

    const handleClickOutside = () => setActiveMenuId(null);

    window.addEventListener("scroll", handleScroll);
    document.addEventListener("click", handleClickOutside);

    return () => {
        unsubscribeGroups(); 
        window.removeEventListener("scroll", handleScroll);
        document.removeEventListener("click", handleClickOutside);
    };
  }, [navigate, location.search, loadLocalGroups]);

  // Reactive Badge Updates
  useEffect(() => {
      const updateCounts = () => {
          setUnreadNotifs(notificationService.getUnreadCount());
          setUnreadMsgs(chatService.getUnreadCount());
      };
      updateCounts();
      const unsubNotif = db.subscribe('notifications', updateCounts);
      const unsubChat = db.subscribe('chats', updateCounts);
      return () => { unsubNotif(); unsubChat(); };
  }, []);

  useEffect(() => {
      const observer = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting && hasMore && !loading) {
              loadLocalGroups(offset);
          }
      }, { threshold: 0.5 });

      if (observerRef.current) {
          observer.observe(observerRef.current);
      }

      return () => observer.disconnect();
  }, [hasMore, loading, offset, loadLocalGroups]);

  const handleGroupClick = (group: Group) => {
      const isCreator = group.creatorEmail === currentUserEmail;
      const isMember = group.memberIds?.includes(currentUserId || '');

      if (isCreator || isMember) {
          if (group.isVip && !isCreator && currentUserId) {
               const hasAccess = db.vipAccess.check(currentUserId, group.id);
               if (!hasAccess) {
                   navigate(`/vip-group-sales/${group.id}`);
                   return;
               }
          }
          navigate(`/group-chat/${group.id}`);
      } else if (group.isVip) {
          navigate(`/vip-group-sales/${group.id}`);
      } else {
          navigate(`/group-landing/${group.id}`);
      }
  };

  const toggleMenu = (e: React.MouseEvent, groupId: string) => {
      e.stopPropagation();
      setActiveMenuId(activeMenuId === groupId ? null : groupId);
  };

  const handleDeleteGroup = async (groupId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setActiveMenuId(null);
      
      const confirmed = await showConfirm(
          "Excluir Grupo?", 
          "Tem certeza que deseja excluir este grupo permanentemente?",
          "Excluir",
          "Cancelar"
      );

      if (confirmed) {
          groupService.deleteGroup(groupId);
          setGroups(prevGroups => prevGroups.filter(g => g.id !== groupId));
      }
  };

  const handleOpenTracking = (group: Group, e: React.MouseEvent) => {
      e.stopPropagation();
      setActiveMenuId(null);
      setSelectedGroupForTracking(group);
      setIsTrackingModalOpen(true);
  };

  const handleJoinByLink = (inputCode: string) => {
      if (!inputCode.trim()) return;
      let code = inputCode;
      if (code.includes('?join=')) code = code.split('?join=')[1];
      const result = groupService.joinGroupByLinkCode(code);
      if (result.success) {
          showAlert("Sucesso!", result.message);
          if (result.groupId) navigate(`/group-chat/${result.groupId}`);
          else loadLocalGroups(0, true);
      } else {
          showAlert("Ops!", result.message);
      }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#0c0f14,_#0a0c10)] text-white font-['Inter'] flex flex-col overflow-x-hidden">
      <style>{`
        .group-preview { display: flex; align-items: center; padding: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); cursor: pointer; transition: background 0.2s; position: relative; }
        .group-preview:hover { background: rgba(0,194,255,0.1); }
        .group-avatar { width: 50px; height: 50px; border-radius: 50%; margin-right: 15px; border: 2px solid #00c2ff; background: rgba(0,194,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0; overflow: hidden; }
        .group-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .group-info { display: flex; flex-direction: column; flex-grow: 1; min-width: 0; margin-right: 10px; }
        .group-info .groupname { font-weight: 600; font-size: 16px; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .group-info .last-message { font-size: 14px; color: #aaa; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .group-unread-badge { background: #ff4d4d; color: #fff; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 20px; min-width: 20px; text-align: center; margin-top: 4px; }
        .group-menu-btn { position: absolute; right: 5px; top: 5px; background: none; border: none; color: rgba(255,255,255,0.6); padding: 8px; cursor: pointer; z-index: 5; }
        .group-dropdown { position: absolute; right: 30px; top: 25px; background: #1a1e26; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); z-index: 10; min-width: 160px; overflow: hidden; display: none; }
        .group-dropdown.active { display: block; }
        .group-dropdown button { display: block; width: 100%; padding: 10px 15px; text-align: left; background: none; border: none; color: #fff; font-size: 14px; cursor: pointer; }
        .group-dropdown button:hover { background: rgba(255,255,255,0.1); }
        .join-via-link-btn { width: 100%; padding: 14px; margin-bottom: 20px; background: rgba(0, 194, 255, 0.08); border: 1px dashed #00c2ff; border-radius: 12px; color: #00c2ff; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; }
      `}</style>

      <header className="flex items-center justify-between p-[16px_32px] bg-[#0c0f14] fixed w-full z-10 border-b border-white/10 top-0 h-[80px]">
        <button onClick={() => navigate('/top-groups')} className="bg-none border-none text-[#00c2ff] text-lg cursor-pointer">
            <i className="fa-solid fa-ranking-star"></i>
        </button>
        <div className="absolute left-1/2 -translate-x-1/2 w-[60px] h-[60px] bg-white/5 rounded-2xl flex justify-center items-center z-20 cursor-pointer shadow-[0_0_20px_rgba(0,194,255,0.3),inset_0_0_20px_rgba(0,194,255,0.08)]" onClick={() => window.scrollTo({top:0, behavior:'smooth'})}>
             <div className="absolute w-[40px] h-[22px] rounded-[50%] border-[3px] border-[#00c2ff] rotate-[25deg]"></div>
             <div className="absolute w-[40px] h-[22px] rounded-[50%] border-[3px] border-[#00c2ff] -rotate-[25deg]"></div>
        </div>
        <button style={{marginLeft:'auto'}} onClick={() => navigate('/messages')} className="bg-none border-none text-[#00c2ff] text-lg cursor-pointer">
            <i className="fa-solid fa-message"></i>
        </button>
      </header>

      <main className="flex-grow pt-[100px] pb-[100px] px-4">
        <button className="join-via-link-btn" onClick={async () => {
            const code = await showPrompt("Entrar via Link", "Cole o código do grupo:", "Ex: AF72B");
            if (code) handleJoinByLink(code);
        }}>
            <i className="fa-solid fa-link"></i> Entrar no Grupo via Link
        </button>

        <div className="w-full">
            {groups.length > 0 ? (
                groups.map(group => {
                    const isCreator = group.creatorEmail === currentUserEmail;
                    const unreadCount = chatService.getGroupUnreadCount(group.id);
                    return (
                        <div key={group.id} className="group-preview" onClick={() => handleGroupClick(group)}>
                            <div className="group-avatar">
                                {group.coverImage ? <img src={group.coverImage} alt={group.name} /> : <i className={`fa-solid ${group.isVip ? 'fa-crown' : 'fa-users'}`}></i>}
                            </div>
                            <div className="group-info">
                                <div className="groupname">{group.name}</div>
                                <div className="last-message">{group.lastMessage || 'Toque para conversar'}</div>
                            </div>
                            <div className="flex flex-col items-end">
                                <div className="text-[10px] uppercase font-bold text-gray-500">{group.time || 'Novo'}</div>
                                {unreadCount > 0 && <div className="group-unread-badge">{unreadCount}</div>}
                            </div>
                            {isCreator && (
                                <>
                                    <button className="group-menu-btn" onClick={(e) => toggleMenu(e, group.id)}>
                                        <i className="fa-solid fa-ellipsis-vertical"></i>
                                    </button>
                                    <div className={`group-dropdown ${activeMenuId === group.id ? 'active' : ''}`}>
                                        <button onClick={(e) => { e.stopPropagation(); navigate(`/group-settings/${group.id}`); }}><i className="fa-solid fa-gear"></i> Configurações</button>
                                        <button onClick={(e) => handleOpenTracking(group, e)}><i className="fa-solid fa-link"></i> Rastreamento</button>
                                        <button onClick={(e) => handleDeleteGroup(group.id, e)} style={{color:'#ff4d4d'}}><i className="fa-solid fa-trash"></i> Excluir</button>
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })
            ) : loading ? (
                <div className="text-center mt-10"><i className="fa-solid fa-circle-notch fa-spin text-2xl text-[#00c2ff]"></i></div>
            ) : (
                <div className="text-center text-gray-500 mt-10">Você não participa de nenhum grupo.</div>
            )}
            <div ref={observerRef} className="h-10"></div>
        </div>
      </main>

      <button onClick={() => navigate('/create-group')} className={`fixed bottom-[105px] right-[20px] w-[60px] h-[60px] bg-[#00c2ff] border-none rounded-full text-white cursor-pointer shadow-[0_4px_12px_rgba(0,194,255,0.3)] z-15 flex items-center justify-center transition-transform duration-300 ${uiVisible ? 'scale-100' : 'scale-0'}`}>
          <i className="fa-solid fa-plus text-2xl"></i>
      </button>

      <footer className={`fixed bottom-0 left-0 w-full bg-[#0c0f14] flex justify-around py-3.5 rounded-t-2xl z-20 shadow-[0_-2px_10px_rgba(0,0,0,0.5)] transition-transform duration-300 ${uiVisible ? 'translate-y-0' : 'translate-y-full'}`}>
        <button onClick={() => navigate('/feed')} className="text-[#00c2ff] text-[22px] p-2 hover:text-white transition-colors">
            <i className="fa-solid fa-newspaper"></i>
        </button>
        <button onClick={() => navigate('/messages')} className="text-[#00c2ff] text-[22px] p-2 relative hover:text-white transition-colors">
            <i className="fa-solid fa-comments"></i>
            {unreadMsgs > 0 && <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#ff4d4d] rounded-full border border-[#0c0f14]"></div>}
        </button>
        <button onClick={() => navigate('/notifications')} className="text-[#00c2ff] text-[22px] p-2 relative hover:text-white transition-colors">
            <i className="fa-solid fa-bell"></i>
            {unreadNotifs > 0 && <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#ff4d4d] rounded-full border border-[#0c0f14]"></div>}
        </button>
        <button onClick={() => navigate('/profile')} className="text-[#00c2ff] text-[22px] p-2 hover:text-white transition-colors">
            <i className="fa-solid fa-user"></i>
        </button>
      </footer>

      {isTrackingModalOpen && selectedGroupForTracking && (
          <Suspense fallback={null}>
              <TrackingModal 
                isOpen={isTrackingModalOpen}
                onClose={() => setIsTrackingModalOpen(false)}
                group={selectedGroupForTracking}
              />
          </Suspense>
      )}
    </div>
  );
};