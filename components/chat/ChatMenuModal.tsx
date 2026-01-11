
import React from 'react';

interface ChatMenuModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSearch: () => void;
    onSelect: () => void;
    onBlock: () => void;
    onClear: () => void;
    isBlocked: boolean;
}

export const ChatMenuModal: React.FC<ChatMenuModalProps> = ({
    isOpen,
    onClose,
    onSearch,
    onSelect,
    onBlock,
    onClear,
    isBlocked
}) => {
    if (!isOpen) return null;

    const options = [
        { label: 'Pesquisar', icon: 'fa-solid fa-magnifying-glass', onClick: onSearch },
        { label: 'Selecionar', icon: 'fa-solid fa-check-double', onClick: onSelect },
        { label: isBlocked ? 'Desbloquear' : 'Bloquear', icon: 'fa-solid fa-ban', onClick: onBlock },
        { label: 'Limpar conversa', icon: 'fa-solid fa-trash-can', onClick: onClear, isDestructive: true }
    ];

    return (
        <div 
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="w-full max-w-md bg-[#1a1e26] rounded-t-3xl p-6 shadow-2xl animate-slide-in-up border-t border-white/5"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="w-12 h-1.5 bg-gray-700 rounded-full mx-auto mb-6 opacity-50"></div>
                
                <h3 className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-4 px-2">Opções do Chat</h3>
                
                <div className="flex flex-col gap-2">
                    {options.map((opt, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                opt.onClick();
                                onClose();
                            }}
                            className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all active:scale-[0.98] ${
                                opt.isDestructive 
                                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' 
                                : 'bg-white/5 text-white hover:bg-white/10'
                            }`}
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                opt.isDestructive ? 'bg-red-500/20' : 'bg-[#00c2ff1a]'
                            }`}>
                                <i className={`${opt.icon} ${opt.isDestructive ? 'text-red-400' : 'text-[#00c2ff]'}`}></i>
                            </div>
                            <span className="font-bold text-sm">{opt.label}</span>
                        </button>
                    ))}
                </div>

                <button 
                    onClick={onClose}
                    className="w-full mt-6 py-4 text-gray-500 font-bold uppercase text-xs hover:text-white transition-colors"
                >
                    Fechar
                </button>
            </div>
        </div>
    );
};
