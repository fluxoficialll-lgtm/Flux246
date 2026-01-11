
import React from 'react';

interface AudioPlayerProps {
    id: number;
    duration?: string;
    isPlaying: boolean;
    onTogglePlay: (id: number, duration?: string) => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ id, duration, isPlaying, onTogglePlay }) => {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '260px', padding: '10px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px' }}>
            <div
                onClick={(e) => { e.stopPropagation(); onTogglePlay(id, duration); }}
                style={{
                    width: '45px', height: '45px', background: isPlaying ? '#00c2ff' : 'rgba(255,255,255,0.2)',
                    color: isPlaying ? '#000' : '#fff',
                    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', fontSize: '18px', flexShrink: 0
                }}
            >
                <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>Áudio ({duration})</span>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.3)', borderRadius: '3px', width: '100%', marginTop: '6px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{
                        height: '100%', background: '#00c2ff', width: isPlaying ? '100%' : '0%', borderRadius: '3px',
                        transition: isPlaying ? 'width 3s linear' : 'width 0.2s linear'
                    }}></div>
                </div>
            </div>
        </div>
    );
};
