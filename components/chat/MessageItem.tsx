
import React from 'react';
import { ChatMessage } from '../../types';
import { LazyMedia } from '../LazyMedia';
import { AudioPlayer } from './AudioPlayer';

interface MessageItemProps {
    msg: ChatMessage;
    isMe: boolean;
    isSelectionMode?: boolean;
    isSelected?: boolean;
    onSelect?: (id: number) => void;
    onMediaClick: (url: string, type: 'image' | 'video') => void;
    onProductClick?: (id: string) => void;
    playingAudioId: number | null;
    onPlayAudio: (id: number, duration?: string) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
    msg, isMe, isSelectionMode, isSelected, onSelect,
    onMediaClick, onProductClick, playingAudioId, onPlayAudio
}) => {
    const isMedia = msg.contentType === 'image' || msg.contentType === 'video';
    const hasOnlyMedia = isMedia && (msg.text === 'Foto' || msg.text === 'Vídeo' || !msg.text);

    return (
        <div className={`message-container ${isMe ? 'sent' : 'received'}`} style={{
            display: 'flex', marginBottom: '8px', alignItems: 'flex-end',
            justifyContent: isMe ? 'flex-end' : 'flex-start', paddingLeft: '10px', paddingRight: '10px'
        }}>
            {isSelectionMode && (
                <div
                    onClick={() => onSelect?.(msg.id)}
                    style={{
                        marginRight: '10px', width: '20px', height: '20px', borderRadius: '50%',
                        border: '2px solid #555', flexShrink: 0, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: isSelected ? '#00c2ff' : 'transparent',
                        borderColor: isSelected ? '#00c2ff' : '#555'
                    }}
                >
                    {isSelected && <span style={{ fontSize: '12px', color: '#000', fontWeight: 'bold' }}>✔</span>}
                </div>
            )}

            <div className="message-bubble" onClick={() => isSelectionMode && onSelect?.(msg.id)} style={{
                maxWidth: '75%',
                padding: hasOnlyMedia ? '0' : '8px 12px',
                borderRadius: '16px',
                fontSize: '15px', lineHeight: 1.4, position: 'relative', minWidth: '80px',
                backgroundColor: hasOnlyMedia ? 'transparent' : (isMe ? '#0088cc' : '#2e3646'),
                color: '#fff',
                border: isSelected && isSelectionMode ? '2px solid #00c2ff' : (hasOnlyMedia ? 'none' : '1px solid rgba(255,255,255,0.1)'),
                overflow: 'hidden'
            }}>
                {!isMe && !hasOnlyMedia && msg.senderName && (
                    <div style={{ fontSize: '10px', fontWeight: 700, marginBottom: '2px', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        {msg.senderAvatar && <img src={msg.senderAvatar} style={{ width: '16px', height: '16px', borderRadius: '50%', objectFit: 'cover' }} />}
                        {msg.senderName}
                    </div>
                )}

                {msg.product && (
                    <div className="msg-product-card" onClick={(e) => { e.stopPropagation(); onProductClick?.(msg.product!.id); }} style={{
                        display: 'flex', gap: '10px', background: 'rgba(0,0,0,0.2)',
                        padding: '8px', border_radius: '8px', margin_bottom: '5px',
                        align_items: 'center', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer'
                    }}>
                        {msg.product.image ? (
                            <img src={msg.product.image} style={{ width: '50px', height: '50px', border_radius: '6px', object_fit: 'cover', background: '#333' }} />
                        ) : (
                            <div style={{ width: '50px', height: '50px', border_radius: '6px', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fa-solid fa-box"></i></div>
                        )}
                        <div style={{ display: 'flex', flex_direction: 'column', flex_grow: 1, min_width: 0 }}>
                            <div style={{ fontSize: '13px', font_weight: 600, color: '#fff', white_space: 'nowrap', overflow: 'hidden', text_overflow: 'ellipsis' }}>{msg.product.title}</div>
                            <div style={{ fontSize: '12px', font_weight: 700, color: '#00ff82' }}>R$ {msg.product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                            <div style={{ fontSize: '10px', color: '#aaa', margin_top: '2px' }}>Ver anúncio <i className="fa-solid fa-chevron-right"></i></div>
                        </div>
                    </div>
                )}

                {msg.contentType === 'audio' && (
                    <AudioPlayer
                        id={msg.id}
                        duration={msg.duration}
                        isPlaying={playingAudioId === msg.id}
                        onTogglePlay={onPlayAudio}
                    />
                )}

                {(msg.contentType === 'image' || msg.contentType === 'video') && msg.mediaUrl && (
                    <div style={{ width: '100%', maxWidth: '320px', borderRadius: '16px', marginBottom: hasOnlyMedia ? '0' : '5px', overflow: 'hidden' }}>
                        <LazyMedia
                            src={msg.mediaUrl}
                            type={msg.contentType}
                            onClick={(e) => { if (!isSelectionMode) { e.stopPropagation(); onMediaClick(msg.mediaUrl!, msg.contentType as 'image' | 'video'); } }}
                        />
                    </div>
                )}

                {msg.contentType === 'file' && msg.mediaUrl && (
                    <a
                        href={!isSelectionMode ? msg.mediaUrl : undefined}
                        download={!isSelectionMode ? (msg.fileName || 'arquivo') : undefined}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                            background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                            textDecoration: 'none', color: '#fff'
                        }}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => isSelectionMode && e.preventDefault()}
                    >
                        <div style={{ width: '40px', height: '40px', background: 'rgba(0,194,255,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00c2ff' }}>
                            <i className="fa-solid fa-file-lines text-xl"></i>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <span style={{ fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msg.fileName || 'Arquivo'}</span>
                            <span style={{ fontSize: '11px', color: '#aaa' }}>Clique para baixar</span>
                        </div>
                    </a>
                )}

                {msg.text && (msg.contentType === 'text' || (msg.text !== 'Foto' && msg.text !== 'Vídeo' && msg.text !== 'Mensagem de Voz' && msg.text !== 'Arquivo')) && (
                    <div style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap', color: '#fff' }}>
                        {msg.text}
                    </div>
                )}

                <div style={{
                    display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
                    fontStyle: 'italic', fontSize: '10px', marginTop: '4px', gap: '4px', opacity: 0.8,
                    padding: hasOnlyMedia ? '4px 8px' : '0',
                    position: hasOnlyMedia ? 'absolute' : 'relative',
                    bottom: hasOnlyMedia ? '4px' : 'auto',
                    right: hasOnlyMedia ? '4px' : 'auto',
                    background: hasOnlyMedia ? 'rgba(0,0,0,0.4)' : 'transparent',
                    borderRadius: hasOnlyMedia ? '10px' : '0',
                    backdropFilter: hasOnlyMedia ? 'blur(4px)' : 'none'
                }}>
                    <span>{msg.timestamp}</span>
                    {isMe && (
                        <i className={`fa-solid ${msg.status === 'read' ? 'fa-check-double text-[#00c2ff]' : (msg.status === 'delivered' ? 'fa-check-double text-gray-400' : 'fa-check text-gray-400')}`} style={{ fontSize: '10px' }}></i>
                    )}
                </div>
            </div>
        </div>
    );
};
