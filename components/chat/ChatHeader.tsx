
import React, { useState, useRef, useEffect } from 'react';

interface ChatHeaderOption {
    label: string;
    onClick: () => void;
    icon: string;
    isDestructive?: boolean;
}

interface ChatHeaderProps {
    title: string;
    subtitle: string;
    avatar?: string;
    isVip?: boolean;
    isSelectionMode?: boolean;
    selectedCount?: number;
    onCancelSelection?: () => void;
    onDeleteSelection?: () => void;
    isSearchOpen?: boolean;
    onToggleSearch?: () => void;
    searchTerm?: string;
    onSearchChange?: (val: string) => void;
    onBack: () => void;
    onInfoClick?: () => void;
    options?: ChatHeaderOption[];
    onMenuClick?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
    title, subtitle, avatar, isVip,
    isSelectionMode, selectedCount, onCancelSelection, onDeleteSelection,
    isSearchOpen, onToggleSearch, searchTerm, onSearchChange,
    onBack, onInfoClick, options, onMenuClick
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (isSelectionMode) {
        return (
            <header style={{
                display: 'flex', alignItems: 'center', padding: '12px 16px',
                background: '#0a2a38', position: 'fixed', width: '100%', zIndex: 20,
                borderBottom: '1px solid rgba(255,255,255,0.1)', top: 0, height: '60px', justifyContent: 'space-between'
            }}>
                <div className="flex items-center">
                    <button onClick={onCancelSelection} style={{ background: 'none', border: 'none', color: '#00c2ff', fontSize: '18px', cursor: 'pointer', padding: '0 10px' }}>
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                    <span style={{ fontSize: '18px', fontWeight: 'bold', marginLeft: '10px', color: '#fff' }}>
                        {selectedCount} selecionada(s)
                    </span>
                </div>
                <button onClick={onDeleteSelection} disabled={selectedCount === 0} style={{ background: 'none', border: 'none', color: '#ff4d4d', fontSize: '18px', cursor: 'pointer', padding: '0 10px', opacity: selectedCount === 0 ? 0.5 : 1 }}>
                    <i className="fa-solid fa-trash"></i>
                </button>
            </header>
        );
    }

    if (isSearchOpen) {
        return (
            <header style={{
                display: 'flex', alignItems: 'center', padding: '12px 16px',
                background: '#15191e', position: 'fixed', width: '100%', zIndex: 20,
                borderBottom: '1px solid rgba(255,255,255,0.1)', top: 0, height: '60px'
            }}>
                <button onClick={onToggleSearch} style={{ background: 'none', border: 'none', color: '#00c2ff', fontSize: '18px', cursor: 'pointer', padding: '0 10px' }}>
                    <i className="fa-solid fa-arrow-left"></i>
                </button>
                <input
                    autoFocus
                    type="text"
                    placeholder="Pesquisar..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange?.(e.target.value)}
                    style={{
                        flexGrow: 1, background: 'rgba(255,255,255,0.1)', border: 'none',
                        borderRadius: '20px', padding: '8px 15px', color: '#fff', margin: '0 10px', fontSize: '14px', outline: 'none'
                    }}
                />
                <button onClick={() => onSearchChange?.('')} style={{ background: 'none', border: 'none', color: '#00c2ff', fontSize: '18px', cursor: 'pointer', padding: '0 10px' }}>
                    <i className="fa-solid fa-xmark"></i>
                </button>
            </header>
        );
    }

    return (
        <header style={{
            display: 'flex', alignItems: 'center', padding: '12px 16px',
            background: '#0c0f14', position: 'fixed', width: '100%', zIndex: 20,
            borderBottom: '1px solid rgba(255,255,255,0.1)', top: 0, height: '60px'
        }}>
            <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#00c2ff', fontSize: '18px', cursor: 'pointer', padding: '0 10px' }}>
                <i className="fa-solid fa-arrow-left"></i>
            </button>

            <div onClick={onInfoClick} style={{ display: 'flex', alignItems: 'center', flexGrow: 1, marginLeft: '10px', cursor: onInfoClick ? 'pointer' : 'default' }}>
                <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: '#1e2531', display: 'flex', justifyContent: 'center', alignItems: 'center',
                    fontSize: '16px', fontWeight: 700, marginRight: '10px', overflow: 'hidden', border: '1px solid #00c2ff', color: '#00c2ff'
                }}>
                    {avatar ? (
                        <img src={avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <i className={`fa-solid ${isVip ? 'fa-crown' : 'fa-user'}`} style={{ fontSize: '16px' }}></i>
                    )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <h2 style={{ fontSize: '16px', color: '#fff', lineHeight: 1.2, fontWeight: 700, margin: 0 }}>{title}</h2>
                        {isVip && <i className="fa-solid fa-shield-halved text-[#FFD700] text-xs"></i>}
                    </div>
                    <p style={{ fontSize: '12px', color: '#00c2ff', opacity: 0.8, fontWeight: 500, margin: 0 }}>{subtitle}</p>
                </div>
            </div>

            {(options && options.length > 0) || onMenuClick ? (
                <div style={{ position: 'relative', marginLeft: '15px' }}>
                    <button
                        ref={buttonRef}
                        onClick={() => onMenuClick ? onMenuClick() : setIsMenuOpen(!isMenuOpen)}
                        style={{ background: 'none', border: 'none', color: '#00c2ff', fontSize: '20px', cursor: 'pointer', padding: '5px' }}
                    >
                        <i className="fa-solid fa-ellipsis-vertical"></i>
                    </button>

                    {isMenuOpen && !onMenuClick && (
                        <div ref={menuRef} style={{
                            position: 'absolute', top: '40px', right: 0,
                            background: '#1a1e26', border: '1px solid rgba(0, 194, 255, 0.2)',
                            borderRadius: '8px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                            width: '200px', zIndex: 20, overflow: 'hidden'
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {options?.map((opt, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => { opt.onClick(); setIsMenuOpen(false); }}
                                        style={{
                                            display: 'flex', alignItems: 'center', padding: '12px 15px',
                                            color: opt.isDestructive ? '#ff4d4d' : '#fff',
                                            background: 'none', border: 'none', fontSize: '14px', cursor: 'pointer', textAlign: 'left'
                                        }}
                                    >
                                        <i className={`${opt.icon} mr-3 w-5 text-center`}></i> {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : null}
        </header>
    );
};
