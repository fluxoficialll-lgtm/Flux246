
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { groupService } from '../services/groupService';
import { chatService } from '../services/chatService'; 
import { authService } from '../services/authService';
import { privacyService } from '../services/privacyService'; 
import { postService } from '../services/postService';
import { db } from '@/database';
import { Group, ChatMessage } from '../types';
import { useModal } from '../components/ModalSystem';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { ChatHeader } from '../components/chat/ChatHeader';
import { ChatInput } from '../components/chat/ChatInput';
import { MessageItem } from '../components/chat/MessageItem';
import { MediaPreviewOverlay } from '../components/chat/MediaPreviewOverlay';
import { useGroupChatActions } from '../components/groups/menu/GroupChatActions';

export const GroupChat: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { showOptions } = useModal(); 
  const [group, setGroup] = useState<Group | null>(null);
  
  const [isCreator, setIsCreator] = useState(false);
  const [canPost, setCanPost] = useState(true);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMsgIds, setSelectedMsgIds] = useState<number[]>([]);

  const [cooldown, setCooldown] = useState(0);

  const [playingAudioId, setPlayingAudioId] = useState<number | null>(null);
  const audioTimeoutRef = useRef<any>(null);

  const [zoomedMedia, setZoomedMedia] = useState<{ url: string, type: 'image' | 'video' } | null>(null);
  const [mediaPreview, setMediaPreview] = useState<{ file: File, url: string, type: 'image' | 'video' | 'file' } | null>(null);
  const [mediaCaption, setMediaCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const [inGracePeriod, setInGracePeriod] = useState(false);

  const currentUserEmail = authService.getCurrentUserEmail();
  const currentUserId = authService.getCurrentUserId();

  // Hook de ações do menu (Dono vs Membro)
  const { menuOptions } = useGroupChatActions({
      group: group || { id: id || '' } as Group,
      isCreator,
      onStartSearch: () => setIsSearchOpen(true),
      onStartSelection: () => setIsSelectionMode(true)
  });

  useEffect(() => {
      if (id) {
          const loadedGroup = groupService.getGroupById(id);
          if (loadedGroup) {
              setGroup(loadedGroup);
              const isOwner = loadedGroup.creatorId === currentUserId;
              const isAdmin = isOwner || (currentUserId && loadedGroup.adminIds?.includes(currentUserId));
              setIsCreator(isOwner);
              setCanPost(isAdmin || !loadedGroup.settings?.onlyAdminsPost);

              if (loadedGroup.isVip) {
                  privacyService.enable();
                  if (!isOwner && currentUserId) {
                      const vipStatus = groupService.checkVipStatus(loadedGroup.id, currentUserId);
                      if (vipStatus === 'expired' || vipStatus === 'none') {
                          privacyService.disable();
                          navigate(`/vip-group-sales/${loadedGroup.id}`, { replace: true });
                          return;
                      }
                      if (vipStatus === 'grace_period') setInGracePeriod(true);
                  }
              }
              loadMessages();
              chatService.markChatAsRead(id);
          } else navigate('/groups');
      }
      return () => privacyService.disable();
  }, [id, navigate, currentUserId]);

  const loadMessages = () => { if (id) setMessages(chatService.getChat(id).messages || []); };

  useEffect(() => {
      const unsub = db.subscribe('chats', loadMessages);
      const unsubGroup = db.subscribe('groups', () => {
          if (id) {
              const g = groupService.getGroupById(id);
              if (g) {
                const isAdmin = g.creatorId === currentUserId || (currentUserId && g.adminIds?.includes(currentUserId));
                setCanPost(isAdmin || !g.settings?.onlyAdminsPost);
              }
          }
      });
      return () => { unsub(); unsubGroup(); };
  }, [id, currentUserId]);

  useEffect(() => {
      if (group?.settings?.msgSlowMode && !isCreator && currentUserEmail) {
          const interval = group.settings.msgSlowModeInterval || 30;
          const myLastMsg = [...messages].reverse().find(m => m.senderEmail === currentUserEmail);
          if (myLastMsg) {
              const elapsedSeconds = (Date.now() - myLastMsg.id) / 1000;
              if (elapsedSeconds < interval) { setCooldown(Math.ceil(interval - elapsedSeconds)); }
          }
      }
  }, [messages, group, isCreator, currentUserEmail]);

  useEffect(() => {
      if (cooldown <= 0) return;
      const timer = setInterval(() => setCooldown(prev => prev <= 1 ? 0 : prev - 1), 1000);
      return () => clearInterval(timer);
  }, [cooldown]);

  const handleSendMessage = (text: string) => {
      if (cooldown > 0 || !id) return;
      const userInfo = authService.getCurrentUser();
      const newMessage: ChatMessage = {
          id: Date.now(),
          senderName: userInfo?.profile?.nickname || userInfo?.profile?.name || 'Você',
          senderAvatar: userInfo?.profile?.photoUrl,
          senderEmail: userInfo?.email,
          text, type: 'sent', contentType: 'text',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'sent'
      };
      chatService.sendMessage(id, newMessage);
  };

  const handleSendMedia = async () => {
      if (!mediaPreview || cooldown > 0 || isUploading || !id) return;
      setIsUploading(true);
      try {
          const mediaUrl = await postService.uploadMedia(mediaPreview.file, 'group_chats');
          const userInfo = authService.getCurrentUser();
          const newMessage: ChatMessage = {
              id: Date.now(),
              senderName: userInfo?.profile?.nickname || userInfo?.profile?.name || 'Você',
              senderAvatar: userInfo?.profile?.photoUrl,
              senderEmail: userInfo?.email,
              text: mediaCaption.trim() || (mediaPreview.type === 'video' ? 'Vídeo' : mediaPreview.type === 'image' ? 'Foto' : 'Arquivo'),
              type: 'sent', contentType: mediaPreview.type,
              mediaUrl, fileName: mediaPreview.type === 'file' ? mediaPreview.file.name : undefined,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              status: 'sent'
          };
          chatService.sendMessage(id, newMessage);
          setMediaPreview(null); setMediaCaption('');
      } catch (e) { alert("Erro ao enviar mídia."); }
      finally { setIsUploading(false); }
  };

  const handleSendAudio = (duration: string) => {
      if (cooldown > 0 || !id) return;
      const userInfo = authService.getCurrentUser();
      const newMessage: ChatMessage = {
          id: Date.now(),
          senderName: userInfo?.profile?.nickname || userInfo?.profile?.name || 'Você',
          senderAvatar: userInfo?.profile?.photoUrl,
          senderEmail: userInfo?.email,
          text: 'Mensagem de Voz', type: 'sent', contentType: 'audio',
          duration, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'sent'
      };
      chatService.sendMessage(id, newMessage);
  };

  const handlePlayAudio = (mid: number, dur?: string) => {
      if (playingAudioId === mid) { setPlayingAudioId(null); if (audioTimeoutRef.current) clearTimeout(audioTimeoutRef.current); }
      else {
          setPlayingAudioId(mid);
          let dMs = 3000;
          if (dur) { const p = dur.split(':'); if (p.length === 2) dMs = (parseInt(p[0]) * 60 + parseInt(p[1])) * 1000; }
          if (audioTimeoutRef.current) clearTimeout(audioTimeoutRef.current);
          audioTimeoutRef.current = setTimeout(() => setPlayingAudioId(null), dMs);
      }
  };

  const displayMessages = searchQuery ? messages.filter(m => m.text?.toLowerCase().includes(searchQuery.toLowerCase())) : messages;

  return (
    <div className={`h-[100dvh] flex flex-col overflow-hidden ${group?.isVip ? 'secure-content' : ''}`} style={{ background: 'radial-gradient(circle at top left, #0c0f14, #0a0c10)', color: '#fff', fontFamily: "'Roboto', sans-serif" }}>
      <ChatHeader
        title={group?.name || 'Carregando...'}
        subtitle={`${messages.length} mensagens ${group?.isVip ? '• 🔒 Protegido' : ''}`}
        avatar={group?.coverImage}
        isVip={group?.isVip}
        onBack={() => navigate('/groups')}
        isSelectionMode={isSelectionMode}
        selectedCount={selectedMsgIds.length}
        onCancelSelection={() => { setIsSelectionMode(false); setSelectedMsgIds([]); }}
        onDeleteSelection={async () => {
            if (selectedMsgIds.length === 0 || !id) return;
            const choice = await showOptions(`Excluir ${selectedMsgIds.length} mensagem(ns)?`, [{ label: 'Excluir para mim', value: 'me', icon: 'fa-user' }, { label: 'Excluir para todos', value: 'all', icon: 'fa-users', isDestructive: true }]);
            if (choice) { chatService.deleteMessages(id, selectedMsgIds, choice); setIsSelectionMode(false); setSelectedMsgIds([]); }
        }}
        isSearchOpen={isSearchOpen}
        onToggleSearch={() => { setIsSearchOpen(!isSearchOpen); setSearchQuery(''); }}
        searchTerm={searchQuery}
        onSearchChange={setSearchQuery}
        options={menuOptions as any}
      />

      {inGracePeriod && (
          <div style={{ background: 'linear-gradient(90deg, #b91c1c, #dc2626)', color: '#fff', padding: '10px', textAlign: 'center', fontSize: '13px', fontWeight: 700, position: 'sticky', top: '60px', zIndex: 19 }}>
              <span>⚠️ Acesso expirado!</span>
              <button onClick={() => navigate(`/vip-group-sales/${id}`)} style={{ background: '#fff', color: '#b91c1c', border: 'none', padding: '4px 10px', borderRadius: '4px', marginLeft: '10px' }}>Pagar Agora</button>
          </div>
      )}

      <main style={{ flexGrow: 1, width: '100%', display: 'flex', flexDirection: 'column', paddingTop: '60px' }}>
          <Virtuoso
              ref={virtuosoRef}
              style={{ height: '100%', paddingBottom: '80px' }}
              data={displayMessages}
              startReached={async () => {
                  if (!id || loadingHistory) return;
                  setLoadingHistory(true);
                  await chatService.fetchChatMessages(id, 50, messages[0]?.id);
                  setLoadingHistory(false);
              }}
              initialTopMostItemIndex={displayMessages.length - 1}
              followOutput="smooth"
              itemContent={(index, msg) => (
                  <MessageItem
                    key={msg.id}
                    msg={msg}
                    isMe={msg.senderEmail ? msg.senderEmail === currentUserEmail : msg.type === 'sent'}
                    isSelectionMode={isSelectionMode}
                    isSelected={selectedMsgIds.includes(msg.id)}
                    onSelect={(mid) => setSelectedMsgIds(prev => prev.includes(mid) ? prev.filter(x => x !== mid) : [...prev, mid])}
                    onMediaClick={(url, type) => setZoomedMedia({ url, type })}
                    playingAudioId={playingAudioId}
                    onPlayAudio={handlePlayAudio}
                  />
              )}
              components={{
                  Header: () => loadingHistory ? <div className="w-full flex justify-center py-2"><i className="fa-solid fa-circle-notch fa-spin text-[#00c2ff]"></i></div> : null,
                  Footer: () => <div style={{ height: '80px' }} />
              }}
          />
      </main>

      {!isSelectionMode && (
          <ChatInput
            onSendMessage={handleSendMessage}
            onSendAudio={handleSendAudio}
            onFileSelect={(file, isDoc) => setMediaPreview({ file, url: URL.createObjectURL(file), type: isDoc ? 'file' : (file.type.startsWith('video/') ? 'video' : 'image') })}
            cooldown={cooldown}
            canPost={canPost}
            isUploading={isUploading}
          />
      )}

      {mediaPreview && (
          <MediaPreviewOverlay
            preview={mediaPreview}
            caption={mediaCaption}
            onCaptionChange={setMediaCaption}
            onSend={handleSendMedia}
            onCancel={() => setMediaPreview(null)}
            isUploading={isUploading}
          />
      )}

      {zoomedMedia && (
          <div className="fixed inset-0 z-[60] bg-black bg-opacity-95 flex items-center justify-center p-2" onClick={() => setZoomedMedia(null)}>
              <button className="absolute top-4 right-4 text-white text-4xl bg-black/50 rounded-full w-10 h-10 flex items-center justify-center z-50">&times;</button>
              {zoomedMedia.type === 'video' ? <video src={zoomedMedia.url} controls autoPlay className="max-w-full max-h-full object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} /> : <img src={zoomedMedia.url} alt="Zoom" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />}
          </div>
      )}
    </div>
  );
};
