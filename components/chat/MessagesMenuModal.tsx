
import React from 'react';

interface MessagesMenuModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectMode: () => void;
    onMarkAllRead: () => void;
    onViewBlocked: () => void;
}

export const MessagesMenuModal: React.FC<MessagesMenuModalProps> = ({
    isOpen,
    onClose,
    onSelectMode,
    onMarkAllRead,
    onViewBlocked
}) => {
    if (!isOpen) return null;

    const options = [
        { 
            label: 'Selecionar conversas', 
            icon: 'fa-solid fa-check-double', 
            onClick: onSelectMode 
        },
        { 
            label: 'Marcar todas como lidas', 
            icon: 'fa-solid fa-envelope-open-text', 
            onClick: onMarkAllRead 
        },
        { 
            label: 'Usuários Bloqueados', 
            icon: 'fa-solid fa-user-shield', 
            onClick: onViewBlocked 
        }
    ];

    return (
        <div 
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="w-full max-w-md bg-[#1a1e26] rounded-t-3xl p-6 shadow-2xl animate-slide-in-up border-t border-white/5 pb-10"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="w-12 h-1.5 bg-gray-700 rounded-full mx-auto mb-6 opacity-50"></div>
                
                <h3 className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-4 px-2">Gerenciar Conversas</h3>
                
                <div className="flex flex-col gap-2">
                    {options.map((opt, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                opt.onClick();
                                onClose();
                            }}
                            className="w-full flex items-center gap-4 p-4 bg-white/5 text-white rounded-2xl transition-all active:scale-[0.98] hover:bg-white/10"
                        >
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#00c2ff1a]">
                                <i className={`${opt.icon} text-[#00c2ff]`}></i>
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
