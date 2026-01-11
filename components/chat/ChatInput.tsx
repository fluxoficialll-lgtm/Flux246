
import React, { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
    onSendMessage: (text: string) => void;
    onFileSelect: (file: File, isDoc: boolean) => void;
    onSendAudio: (duration: string) => void;
    cooldown?: number;
    isBlocked?: boolean;
    canPost?: boolean;
    placeholder?: string;
    isUploading?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
    onSendMessage, onFileSelect, onSendAudio,
    cooldown = 0, isBlocked = false, canPost = true,
    placeholder = "Mensagem...", isUploading = false
}) => {
    const [inputText, setInputText] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const recordingInterval = useRef<any>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isRecording) {
            recordingInterval.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } else {
            clearInterval(recordingInterval.current);
            setRecordingTime(0);
        }
        return () => clearInterval(recordingInterval.current);
    }, [isRecording]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const handleSend = () => {
        if (inputText.trim()) {
            onSendMessage(inputText);
            setInputText('');
        }
    };

    const handleAudioAction = () => {
        if (inputText.trim()) {
            handleSend();
        } else {
            if (isRecording) {
                setIsRecording(false);
                onSendAudio(formatTime(recordingTime));
            } else {
                setIsRecording(true);
            }
        }
    };

    if (isBlocked) {
        return (
            <div style={{
                position: 'fixed', bottom: '0', width: '100%', background: '#1a1a1a',
                padding: '15px', textAlign: 'center', color: '#ff4d4d', fontStyle: 'italic', fontWeight: 'bold',
                borderTop: '1px solid rgba(255,255,255,0.1)', zIndex: 15
            }}>
                Você bloqueou este contato.
            </div>
        );
    }

    if (!canPost) {
        return (
            <div style={{
                position: 'fixed', bottom: 0, width: '100%', background: '#1a1e26',
                padding: '15px', textAlign: 'center', color: '#aaa', fontSize: '13px',
                borderTop: '1px solid rgba(255,255,255,0.1)', zIndex: 15
            }}>
                <i className="fa-solid fa-lock"></i> Apenas administradores podem postar.
            </div>
        );
    }

    return (
        <div style={{
            position: 'fixed', bottom: '0', width: '100%', background: '#0c0f14',
            padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px',
            borderTop: '1px solid rgba(255,255,255,0.1)', zIndex: 15, paddingBottom: '20px'
        }}>
            {isRecording ? (
                <>
                    <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', padding: '0 10px', color: '#ff4d4d' }}>
                        <div style={{ width: '10px', height: '10px', background: '#ff4d4d', borderRadius: '50%', marginRight: '10px' }}></div>
                        <span>Gravando {formatTime(recordingTime)}</span>
                    </div>
                    <button onClick={() => setIsRecording(false)} style={{ color: '#ff4d4d', fontSize: '14px', fontWeight: 'bold', background: 'none', border: 'none', cursor: 'pointer', marginRight: '10px' }}>
                        Cancelar
                    </button>
                </>
            ) : (
                <>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: '#1a1e26', borderRadius: '24px', padding: '0 5px' }}>
                        <input
                            type="text"
                            placeholder={placeholder}
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            style={{
                                flexGrow: 1, padding: '12px 15px', border: 'none', background: 'transparent',
                                color: '#fff', fontSize: '16px', outline: 'none', borderRadius: '24px'
                            }}
                        />
                        <button onClick={() => docInputRef.current?.click()} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '18px', cursor: 'pointer', padding: '8px 10px' }}>
                            <i className="fa-solid fa-paperclip"></i>
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '18px', cursor: 'pointer', padding: '8px 10px 8px 0' }}>
                            <i className="fa-solid fa-camera"></i>
                        </button>
                    </div>
                    <input type="file" ref={fileInputRef} accept="image/*,video/*" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0], false)} />
                    <input type="file" ref={docInputRef} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0], true)} />
                </>
            )}

            <button
                onClick={handleAudioAction}
                disabled={cooldown > 0 || isUploading}
                style={{
                    background: '#00c2ff', border: 'none', color: '#000',
                    fontSize: '18px', cursor: 'pointer',
                    width: '48px', height: '48px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, boxShadow: '0 2px 5px rgba(0,0,0,0.2)', opacity: cooldown > 0 ? 0.5 : 1
                }}
            >
                {isUploading ? (
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                ) : (
                    <i className={`fa-solid ${inputText.trim() || isRecording ? 'fa-paper-plane' : 'fa-microphone'}`}></i>
                )}
            </button>
        </div>
    );
};
