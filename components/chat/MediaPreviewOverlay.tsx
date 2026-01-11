
import React from 'react';

interface MediaPreviewOverlayProps {
    preview: { url: string, type: 'image' | 'video' | 'file', file: File };
    caption: string;
    onCaptionChange: (val: string) => void;
    onSend: () => void;
    onCancel: () => void;
    isUploading: boolean;
}

export const MediaPreviewOverlay: React.FC<MediaPreviewOverlayProps> = ({
    preview, caption, onCaptionChange, onSend, onCancel, isUploading
}) => {
    return (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-sm bg-[#1a1e26] rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col">
                <div className="relative w-full bg-black flex items-center justify-center aspect-square" style={{ maxHeight: '60vh' }}>
                    {preview.type === 'video' ? (
                        <video src={preview.url} controls className="w-full h-full object-contain" />
                    ) : preview.type === 'image' ? (
                        <img src={preview.url} alt="Preview" className="w-full h-full object-contain" />
                    ) : (
                        <div className="flex flex-col items-center justify-center p-6 text-gray-300">
                            <i className="fa-solid fa-file-lines text-6xl mb-4 text-[#00c2ff]"></i>
                            <p className="text-center font-semibold break-all px-4">{preview.file.name}</p>
                            <p className="text-xs text-gray-500 mt-2">{(preview.file.size / 1024).toFixed(1)} KB</p>
                        </div>
                    )}
                    
                    <button 
                        onClick={onCancel}
                        disabled={isUploading}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 backdrop-blur-sm z-10"
                    >
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div className="p-3 bg-[#1a1e26] flex gap-2 items-center">
                    <input 
                        type="text" 
                        placeholder="Adicione uma legenda..." 
                        value={caption}
                        onChange={(e) => onCaptionChange(e.target.value)}
                        disabled={isUploading}
                        className="flex-1 bg-[#0c0f14] text-gray-100 text-sm px-4 py-3 rounded-xl border border-white/5 outline-none placeholder-gray-500"
                        autoFocus
                    />
                    <button 
                        onClick={onSend}
                        disabled={isUploading}
                        className="w-12 h-12 bg-[#00c2ff] rounded-xl text-black flex items-center justify-center text-lg hover:bg-[#00aaff] transition-transform active:scale-95"
                    >
                        {isUploading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-paper-plane"></i>}
                    </button>
                </div>
            </div>
        </div>
    );
};
