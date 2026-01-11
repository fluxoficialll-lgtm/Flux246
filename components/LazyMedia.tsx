import React, { useState, useEffect, useRef } from 'react';

interface LazyMediaProps {
    src: string;
    type: 'image' | 'video';
    alt?: string;
    onClick?: (e: React.MouseEvent) => void;
    className?: string;
}

export const LazyMedia: React.FC<LazyMediaProps> = ({ src, type, alt, onClick, className }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const elementRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1, rootMargin: '200px' }
        );

        if (elementRef.current) {
            observer.observe(elementRef.current);
        }

        return () => observer.disconnect();
    }, []);

    const containerStyle = "w-full flex items-center justify-center overflow-hidden relative rounded-[inherit]";

    if (!isVisible) {
        return (
            <div ref={elementRef} className={`${containerStyle} bg-white/5 min-h-[150px] ${className || ''}`}>
                <i className={`fa-solid ${type === 'video' ? 'fa-video' : 'fa-image'} text-gray-700 text-xl`}></i>
            </div>
        );
    }

    if (type === 'image') {
        return (
            <div className={`${containerStyle} ${className || ''}`} onClick={onClick}>
                {!isLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center animate-pulse bg-white/5">
                        <i className="fa-solid fa-image text-gray-700"></i>
                    </div>
                )}
                <img 
                    src={src} 
                    alt={alt || "Media"} 
                    className={`w-full h-auto max-h-[550px] object-contain rounded-[inherit] transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setIsLoaded(true)}
                    loading="lazy"
                />
            </div>
        );
    }

    return (
        <div className={`${containerStyle} ${className || ''}`}>
            <video 
                src={src} 
                className="w-full h-auto max-h-[550px] object-contain cursor-pointer rounded-[inherit]"
                onLoadedData={() => setIsLoaded(true)}
                onClick={onClick}
                preload="metadata"
                playsInline
                muted
            />
            {!isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <i className="fa-solid fa-circle-notch fa-spin text-white/50"></i>
                </div>
            )}
            <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded text-[9px] text-white font-bold tracking-wider">
                VÍDEO
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-60">
                 <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center border border-white/10">
                    <i className="fa-solid fa-play text-white text-xs ml-0.5"></i>
                 </div>
            </div>
        </div>
    );
};