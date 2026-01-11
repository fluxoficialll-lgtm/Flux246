
import React, { useState, useRef, useEffect } from 'react';

interface ImageCropModalProps {
    isOpen: boolean;
    imageSrc: string;
    onClose: () => void;
    onSave: (croppedImage: string) => void;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({ isOpen, imageSrc, onClose, onSave }) => {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    // Resetar estado ao abrir nova imagem
    useEffect(() => {
        if (isOpen) {
            setScale(1);
            setPosition({ x: 0, y: 0 });
        }
    }, [isOpen, imageSrc]);

    if (!isOpen) return null;

    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDragging(true);
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        setDragStart({ x: clientX - position.x, y: clientY - position.y });
    };

    const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDragging) return;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        setPosition({
            x: clientX - dragStart.x,
            y: clientY - dragStart.y
        });
    };

    const handleMouseUp = () => setIsDragging(false);

    const handleApply = () => {
        if (!imageRef.current) return;

        const canvas = document.createElement('canvas');
        const size = 400; // Tamanho padrão para avatar
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        if (ctx) {
            const img = imageRef.current;
            const displayWidth = img.width * scale;
            const displayHeight = img.height * scale;
            
            // Calculando a posição no canvas baseada no enquadramento visual
            // O círculo no CSS tem 280px. O canvas tem 400px.
            // Precisamos mapear o que está dentro do círculo de 280px para o canvas de 400px.
            const ratio = size / 280;
            
            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, size, size);

            // Ajuste de centro
            const offsetX = (position.x * ratio) + (size / 2) - (displayWidth * ratio / 2);
            const offsetY = (position.y * ratio) + (size / 2) - (displayHeight * ratio / 2);

            ctx.drawImage(
                img, 
                offsetX, 
                offsetY, 
                displayWidth * ratio, 
                displayHeight * ratio
            );

            onSave(canvas.toDataURL('image/jpeg', 0.9));
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col animate-fade-in touch-none">
            <style>{`
                .crop-mask {
                    position: absolute;
                    inset: 0;
                    pointer-events: none;
                    background: radial-gradient(circle 140px at center, transparent 100%, rgba(0,0,0,0.7) 100%);
                    border: 2px solid rgba(0, 194, 255, 0.3);
                    border-radius: 50%;
                    width: 280px;
                    height: 280px;
                    margin: auto;
                    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.8);
                }
                .image-container {
                    flex: 1;
                    position: relative;
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #050505;
                }
                .draggable-img {
                    max-width: none;
                    cursor: move;
                    user-select: none;
                    touch-action: none;
                }
                .crop-footer {
                    background: #0c0f14;
                    padding: 30px 20px;
                    border-top: 1px solid rgba(255,255,255,0.1);
                }
                .zoom-slider {
                    width: 100%;
                    height: 6px;
                    -webkit-appearance: none;
                    background: #1e2531;
                    border-radius: 3px;
                    outline: none;
                    margin-bottom: 25px;
                }
                .zoom-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 24px;
                    height: 24px;
                    background: #00c2ff;
                    border-radius: 50%;
                    cursor: pointer;
                }
            `}</style>

            <header className="flex justify-between items-center p-5 bg-[#0c0f14] border-b border-white/10">
                <button onClick={onClose} className="text-white text-sm font-bold uppercase tracking-widest opacity-70">Cancelar</button>
                <h2 className="text-white font-bold">Ajustar Foto</h2>
                <button onClick={handleApply} className="text-[#00c2ff] text-sm font-bold uppercase tracking-widest">Concluir</button>
            </header>

            <div 
                className="image-container"
                ref={containerRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleMouseDown}
                onTouchMove={handleMouseMove}
                onTouchEnd={handleMouseUp}
            >
                <img 
                    ref={imageRef}
                    src={imageSrc} 
                    className="draggable-img"
                    draggable={false}
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                    }}
                    alt="To crop"
                />
                <div className="crop-mask"></div>
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/40 text-[10px] uppercase font-bold tracking-widest pointer-events-none">
                    Arraste para enquadrar
                </div>
            </div>

            <div className="crop-footer">
                <div className="flex items-center gap-4 mb-4">
                    <i className="fa-solid fa-minus text-gray-500 text-xs"></i>
                    <input 
                        type="range" 
                        min="1" 
                        max="3" 
                        step="0.01" 
                        value={scale} 
                        onChange={(e) => setScale(parseFloat(e.target.value))} 
                        className="zoom-slider"
                    />
                    <i className="fa-solid fa-plus text-gray-500 text-xs"></i>
                </div>
                <div className="flex justify-center gap-8">
                    <button onClick={() => setPosition({x: 0, y: 0})} className="text-gray-400 text-xs flex flex-col items-center gap-1">
                        <i className="fa-solid fa-arrows-to-dot"></i> Centralizar
                    </button>
                    <button onClick={() => setScale(1)} className="text-gray-400 text-xs flex flex-col items-center gap-1">
                        <i className="fa-solid fa-maximize"></i> Resetar Zoom
                    </button>
                </div>
            </div>
        </div>
    );
};
