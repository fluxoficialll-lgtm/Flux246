
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { chatService, ChatMessage } from '../services/chatService';
import { authService } from '../services/authService';
import { postService } from '../services/postService';
import { db } from '@/database';
import { useModal } from '../components/ModalSystem';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { ChatHeader } from '../components/chat/ChatHeader';
import { ChatInput } from '../components/chat/ChatInput';
import { MessageItem } from '../components/chat/MessageItem';
import { MediaPreviewOverlay } from '../components/chat/MediaPreviewOverlay';
import { ChatMenuModal } from '../components/chat/ChatMenuModal';

export const Chat: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { showConfirm } = useModal();
  const chatId = id || '1';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [contactName, setContactName] = useState('');
  const [contactHandle, setContactHandle] = useState(''); 
  const [contactAvatar, setContactAvatar] = useState<string | undefined>(undefined);
  const [contactStatus, setContactStatus] = useState('Offline');
  const [isBlocked, setIsBlocked] = useState(false);

  const [loadingHistory, setLoadingHistory] = useState(false);
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [playingAudioId, setPlayingAudioId] = useState<number | null>(null);
  const audioTimeoutRef = useRef<any>(null);

  const [zoomedMedia, setZoomedMedia] = useState<{ url: string, type: 'image' | 'video' } | null>(null);
  const [mediaPreview, setMediaPreview] = useState<{ file: File, url: string, type: 'image' | 'video' | 'file' } | null>(null);
  const [mediaCaption, setMediaCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);

  const currentUserEmail = authService.getCurrentUserEmail();

  useEffect(() => {
      loadChatData();
      setTimeout(() => { chatService.markChatAsRead(chatId); }, 500);
  }, [chatId]);

  useEffect(() => {
      const unsub = db.subscribe('chats', () => loadChatData(true));
      const unsubUser = db.subscribe('users', () => loadChatData(true));
      return () => { unsub(); unsubUser(); };
  }, [chatId]);

  const loadChatData = (isSilent = false) => {
      const chatData = chatService.getChat(chatId);
      setIsBlocked(chatData.isBlocked);

      let targetUser = undefined;
      let displayName = chatData.contactName;
      let displayAvatar = undefined;
      let handle = '';

      if (chatId.includes('_') && chatId.includes('@') && currentUserEmail) {
          const otherEmail = chatId.split('_').find(p => p !== currentUserEmail);
          if (otherEmail) {
              const userRecord = db.users.get(otherEmail);
              if (userRecord) {
                  targetUser = userRecord;
                  displayName = userRecord.profile?.nickname || userRecord.profile?.name || otherEmail;
                  displayAvatar = userRecord.profile?.photoUrl;
                  handle = userRecord.profile?.name || '';
              } else displayName = otherEmail;
          }
      } else {
          targetUser = authService.getUserByHandle(chatData.contactName);
          if (targetUser) {
              displayName = targetUser.profile?.nickname || targetUser.profile?.name || chatData.contactName;
              displayAvatar = targetUser.profile?.photoUrl;
              handle = targetUser.profile?.name || '';
          }
      }

      setContactName(displayName);
      setContactAvatar(displayAvatar);
      setContactHandle(handle);

      if (targetUser?.lastSeen) {
          const diff = Date.now() - targetUser.lastSeen;
          if (diff < 2 * 60 * 1000) setContactStatus('Online');
          else {
              const date = new Date(targetUser.lastSeen);
              setContactStatus(`Visto por último às ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`);
          }
      } else setContactStatus('Offline');

      setMessages(chatData.messages);
  };

  const handleSendMessage = (text: string) => {
      const userInfo = authService.getCurrentUser();
      const newMessage: ChatMessage = {
          id: Date.now(),
          text,
          type: 'sent',
          contentType: 'text',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'sent',
          senderEmail: userInfo?.email,
          senderAvatar: userInfo?.profile?.photoUrl,
          senderName: userInfo?.profile?.nickname || userInfo?.profile?.name || 'Você'
      };
      chatService.sendMessage(chatId, newMessage);
  };

  const handleSendMedia = async () => {
      if (!mediaPreview || isUploading) return;
      setIsUploading(true);
      try {
          const mediaUrl = await postService.uploadMedia(mediaPreview.file, 'chats');
          const userInfo = authService.getCurrentUser();
          const newMessage: ChatMessage = {
              id: Date.now(),
              text: mediaCaption.trim() || (mediaPreview.type === 'video' ? 'Vídeo' : mediaPreview.type === 'image' ? 'Foto' : 'Arquivo'),
              type: 'sent',
              contentType: mediaPreview.type,
              mediaUrl: mediaUrl,
              fileName: mediaPreview.type === 'file' ? mediaPreview.file.name : undefined,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              status: 'sent',
              senderEmail: userInfo?.email,
              senderAvatar: userInfo?.profile?.photoUrl,
              senderName: userInfo?.profile?.nickname || userInfo?.profile?.name || 'Você'
          };
          chatService.sendMessage(chatId, newMessage);
          setMediaPreview(null);
          setMediaCaption('');
      } catch (e) { alert("Erro ao enviar mídia."); }
      finally { setIsUploading(false); }
  };

  const handleSendAudio = (duration: string) => {
      const userInfo = authService.getCurrentUser();
      const newMessage: ChatMessage = {
          id: Date.now(),
          text: 'Mensagem de Voz',
          type: 'sent',
          contentType: 'audio',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'sent',
          duration,
          senderEmail: userInfo?.email,
          senderAvatar: userInfo?.profile?.photoUrl,
          senderName: userInfo?.profile?.nickname || userInfo?.profile?.name || 'Você'
      };
      chatService.sendMessage(chatId, newMessage);
  };

  const handleToggleSelection = (msgId: number) => {
      setSelectedIds(prev => prev.includes(msgId) ? prev.filter(id => id !== msgId) : [...prev, msgId]);
  };

  const handleDeleteSelected = async () => {
      if (selectedIds.length === 0) return;
      if (await showConfirm("Excluir Mensagens", `Excluir ${selectedIds.length} mensagens?`, "Excluir", "Cancelar")) {
          chatService.deleteMessages(chatId, selectedIds);
          setIsSelectionMode(false);
          setSelectedIds([]);
      }
  };

  const handlePlayAudio = (id: number, durationStr?: string) => {
      if (playingAudioId === id) {
          setPlayingAudioId(null);
          if (audioTimeoutRef.current) clearTimeout(audioTimeoutRef.current);
      } else {
          setPlayingAudioId(id);
          let durationMs = 3000;
          if (durationStr) {
              const parts = durationStr.split(':');
              if (parts.length === 2) durationMs = (parseInt(parts[0]) * 60 + parseInt(parts[1])) * 1000;
          }
          if (audioTimeoutRef.current) clearTimeout(audioTimeoutRef.current);
          audioTimeoutRef.current = setTimeout(() => setPlayingAudioId(null), durationMs);
      }
  };

  const handleBlockAction = async () => {
    const action = isBlocked ? "desbloquear" : "bloquear";
    if (await showConfirm(`${action === 'bloquear' ? 'Bloquear' : 'Desbloquear'} Usuário`, `Deseja realmente ${action} este contato?`, action === 'bloquear' ? 'Bloquear' : 'Desbloquear', "Cancelar")) {
        setIsBlocked(chatService.toggleBlock(chatId));
    }
  };

  const handleClearChat = async () => {
    if (await showConfirm("Limpar Conversa", "Tem certeza que deseja limpar toda a conversa? Isso não pode ser desfeito.", "Limpar", "Cancelar")) {
        chatService.clearChat(chatId);
    }
  };

  const filteredMessages = messages.filter(m => m.text.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="messages-page h-[100dvh] flex flex-col overflow-hidden" style={{ background: 'radial-gradient(circle at top left, #0c0f14, #0a0c10)', color: '#fff', fontFamily: "'Roboto', sans-serif" }}>
      <ChatHeader
        title={contactName}
        subtitle={isBlocked ? 'Bloqueado' : contactStatus}
        avatar={contactAvatar}
        onBack={() => navigate('/messages')}
        onInfoClick={() => contactHandle && navigate(`/user/${contactHandle}`)}
        isSelectionMode={isSelectionMode}
        selectedCount={selectedIds.length}
        onCancelSelection={() => { setIsSelectionMode(false); setSelectedIds([]); }}
        onDeleteSelection={handleDeleteSelected}
        isSearchOpen={isSearchOpen}
        onToggleSearch={() => { setIsSearchOpen(!isSearchOpen); setSearchTerm(''); }}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onMenuClick={() => setIsMenuModalOpen(true)}
      />

      <main style={{ flexGrow: 1, width: '100%', display: 'flex', flexDirection: 'column', paddingTop: '60px' }}>
        {messages.length === 0 && !searchTerm && !loadingHistory ? (
            <div className="flex flex-col items-center justify-center h-full opacity-50 mt-20 animate-fade-in">
                <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mb-4 border border-gray-700">
                    <i className="fa-regular fa-comments text-4xl text-[#00c2ff]"></i>
                </div>
                <p className="text-lg font-bold text-white mb-1">Chat Limpo</p>
                <p className="text-sm text-gray-400">Envie uma mensagem para começar.</p>
            </div>
        ) : (
            <Virtuoso
                ref={virtuosoRef}
                style={{ height: '100%', paddingBottom: '80px' }}
                data={filteredMessages}
                startReached={async () => {
                    if (loadingHistory) return;
                    setLoadingHistory(true);
                    await chatService.fetchChatMessages(chatId, 50, messages[0]?.id);
                    setLoadingHistory(false);
                }}
                initialTopMostItemIndex={filteredMessages.length - 1}
                followOutput="smooth"
                itemContent={(index, msg) => (
                    <MessageItem
                        key={msg.id}
                        msg={msg}
                        isMe={msg.senderEmail ? msg.senderEmail === currentUserEmail : msg.type === 'sent'}
                        isSelectionMode={isSelectionMode}
                        isSelected={selectedIds.includes(msg.id)}
                        onSelect={handleToggleSelection}
                        onMediaClick={(url, type) => setZoomedMedia({ url, type })}
                        onProductClick={(pid) => navigate(`/marketplace/product/${pid}`)}
                        playingAudioId={playingAudioId}
                        onPlayAudio={handlePlayAudio}
                    />
                )}
                components={{
                    Header: () => loadingHistory ? <div className="w-full flex justify-center py-2"><i className="fa-solid fa-circle-notch fa-spin text-[#00c2ff]"></i></div> : null,
                    Footer: () => <div style={{ height: '80px' }} />
                }}
            />
        )}
      </main>

      {!isSelectionMode && (
        <ChatInput
            onSendMessage={handleSendMessage}
            onSendAudio={handleSendAudio}
            onFileSelect={(file, isDoc) => setMediaPreview({ file, url: URL.createObjectURL(file), type: isDoc ? 'file' : (file.type.startsWith('video/') ? 'video' : 'image') })}
            isBlocked={isBlocked}
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

      <ChatMenuModal 
        isOpen={isMenuModalOpen}
        onClose={() => setIsMenuModalOpen(false)}
        isBlocked={isBlocked}
        onSearch={() => setIsSearchOpen(true)}
        onSelect={() => setIsSelectionMode(true)}
        onBlock={handleBlockAction}
        onClear={handleClearChat}
      />

      {zoomedMedia && (
          <div className="fixed inset-0 z-[60] bg-black bg-opacity-95 flex items-center justify-center p-2" onClick={() => setZoomedMedia(null)}>
              <button className="absolute top-4 right-4 text-white text-4xl bg-black/50 rounded-full w-10 h-10 flex items-center justify-center z-50">&times;</button>
              {zoomedMedia.type === 'video' ? (
                  <video src={zoomedMedia.url} controls autoPlay className="max-w-full max-h-full object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
              ) : (
                  <img src={zoomedMedia.url} alt="Zoom" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
              )}
          </div>
      )}
    </div>
  );
};
