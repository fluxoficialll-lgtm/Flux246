
import React from 'react';

type AccessType = 'lifetime' | 'temporary' | 'one_time';

interface AccessTypeModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentType: AccessType;
    onSelect: (type: AccessType) => void;
}

export const AccessTypeModal: React.FC<AccessTypeModalProps> = ({ isOpen, onClose, currentType, onSelect }) => {
    if (!isOpen) return null;

    const options: { id: AccessType; label: string; desc: string; icon: string; color: string }[] = [
        { 
            id: 'lifetime', 
            label: 'Vitalício', 
            desc: 'Pagamento único para acesso permanente.', 
            icon: 'fa-infinity',
            color: '#FFD700'
        },
        { 
            id: 'temporary', 
            label: 'Periódico', 
            desc: 'Assinatura com renovação recorrente.', 
            icon: 'fa-calendar-days',
            color: '#00c2ff'
        },
        { 
            id: 'one_time', 
            label: 'Consumo Único', 
            desc: 'Acesso pontual a um conteúdo ou evento.', 
            icon: 'fa-ticket',
            color: '#00ff82'
        }
    ];

    return (
        <div className="fixed inset-0 bg-black/90 z-[120] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <style>{`
                .access-modal-card {
                    width: 100%;
                    max-width: 360px;
                    background: #1a1e26;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 24px;
                    padding: 30px 20px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
                    animation: popIn 0.3s ease;
                }
                .access-option {
                    width: 100%;
                    padding: 16px;
                    background: rgba(255, 255, 255, 0.03);
                    border: 2px solid transparent;
                    border-radius: 16px;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    cursor: pointer;
                    transition: 0.2s;
                    margin-bottom: 12px;
                    text-align: left;
                }
                .access-option:hover {
                    background: rgba(255, 255, 255, 0.06);
                    transform: translateY(-2px);
                }
                .access-option.active {
                    border-color: #00c2ff;
                    background: rgba(0, 194, 255, 0.05);
                }
                .access-icon-box {
                    width: 44px;
                    height: 44px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    flex-shrink: 0;
                }
                .access-info h4 {
                    font-size: 16px;
                    font-weight: 700;
                    color: #fff;
                    margin: 0;
                }
                .access-info p {
                    font-size: 12px;
                    color: #888;
                    margin: 2px 0 0 0;
                    line-height: 1.3;
                }
            `}</style>
            <div className="access-modal-card">
                <h2 className="text-xl font-bold text-center mb-6 text-white">Tipo de Acesso</h2>
                
                <div className="space-y-3">
                    {options.map((opt) => (
                        <button 
                            key={opt.id}
                            className={`access-option ${currentType === opt.id ? 'active' : ''}`}
                            onClick={() => { onSelect(opt.id); onClose(); }}
                        >
                            <div className="access-icon-box" style={{ background: `${opt.color}1a`, color: opt.color }}>
                                <i className={`fa-solid ${opt.icon}`}></i>
                            </div>
                            <div className="access-info">
                                <h4>{opt.label}</h4>
                                <p>{opt.desc}</p>
                            </div>
                            {currentType === opt.id && (
                                <i className="fa-solid fa-circle-check ml-auto text-[#00c2ff]"></i>
                            )}
                        </button>
                    ))}
                </div>

                <button 
                    className="w-full mt-6 py-4 text-gray-500 font-bold uppercase text-xs hover:text-white transition-colors"
                    onClick={onClose}
                >
                    Cancelar
                </button>
            </div>
        </div>
    );
};
