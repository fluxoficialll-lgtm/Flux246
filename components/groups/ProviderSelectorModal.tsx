
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';

interface ProviderSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedProviderId: string | null;
    onSelect: (providerId: string) => void;
}

export const ProviderSelectorModal: React.FC<ProviderSelectorModalProps> = ({ 
    isOpen, 
    onClose, 
    selectedProviderId, 
    onSelect 
}) => {
    const navigate = useNavigate();
    
    const connectedProviders = useMemo(() => {
        const user = authService.getCurrentUser();
        if (!user) return [];
        
        const list = [];
        
        // Check legacy/default provider
        if (user.paymentConfig?.isConnected) {
            list.push({
                id: user.paymentConfig.providerId,
                name: user.paymentConfig.providerId === 'syncpay' ? 'SyncPay (Pix)' : user.paymentConfig.providerId.toUpperCase(),
                icon: user.paymentConfig.providerId === 'syncpay' ? 'fa-bolt' : 'fa-credit-card'
            });
        }
        
        // Check multiple providers map
        if (user.paymentConfigs) {
            Object.values(user.paymentConfigs).forEach(conf => {
                if (conf.isConnected && !list.find(l => l.id === conf.providerId)) {
                    list.push({
                        id: conf.providerId,
                        name: conf.providerId === 'syncpay' ? 'SyncPay (Pix)' : 
                              conf.providerId === 'stripe' ? 'Stripe (Global)' : 
                              conf.providerId === 'paypal' ? 'PayPal' : conf.providerId.toUpperCase(),
                        icon: conf.providerId === 'syncpay' ? 'fa-bolt' : 
                              conf.providerId === 'stripe' ? 'fa-brands fa-stripe' : 
                              conf.providerId === 'paypal' ? 'fa-brands fa-paypal' : 'fa-wallet'
                    });
                }
            });
        }
        
        return list;
    }, []);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/90 z-[130] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <style>{`
                .provider-modal-card {
                    width: 100%;
                    max-width: 360px;
                    background: #1a1e26;
                    border: 1px solid rgba(0, 194, 255, 0.3);
                    border-radius: 24px;
                    padding: 30px 24px;
                    box-shadow: 0 10px 50px rgba(0, 0, 0, 0.6);
                    animation: popIn 0.3s ease;
                }
                .provider-opt {
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
                .provider-opt:hover {
                    background: rgba(255, 255, 255, 0.06);
                    transform: translateY(-2px);
                }
                .provider-opt.active {
                    border-color: #00c2ff;
                    background: rgba(0, 194, 255, 0.05);
                }
                .provider-icon-box {
                    width: 40px;
                    height: 40px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(0, 194, 255, 0.1);
                    color: #00c2ff;
                    font-size: 18px;
                    flex-shrink: 0;
                }
                .provider-info h4 {
                    font-size: 15px;
                    font-weight: 700;
                    color: #fff;
                    margin: 0;
                }
                .no-providers-box {
                    text-align: center;
                    padding: 20px 0;
                }
                .connect-now-btn {
                    width: 100%;
                    padding: 16px;
                    background: #00c2ff;
                    color: #000;
                    border-radius: 12px;
                    font-weight: 800;
                    border: none;
                    cursor: pointer;
                    margin-top: 15px;
                    box-shadow: 0 4px 15px rgba(0, 194, 255, 0.3);
                }
            `}</style>
            <div className="provider-modal-card">
                <h2 className="text-xl font-bold text-center mb-6 text-white">Escolher Provedor</h2>
                
                {connectedProviders.length > 0 ? (
                    <div className="space-y-1">
                        {connectedProviders.map((p) => (
                            <button 
                                key={p.id}
                                className={`provider-opt ${selectedProviderId === p.id ? 'active' : ''}`}
                                onClick={() => { onSelect(p.id); onClose(); }}
                            >
                                <div className="provider-icon-box">
                                    <i className={`fa-solid ${p.icon}`}></i>
                                </div>
                                <div className="provider-info">
                                    <h4>{p.name}</h4>
                                </div>
                                {selectedProviderId === p.id && (
                                    <i className="fa-solid fa-circle-check ml-auto text-[#00c2ff]"></i>
                                )}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="no-providers-box">
                        <i className="fa-solid fa-plug-circle-exclamation text-4xl text-gray-600 mb-4"></i>
                        <p className="text-sm text-gray-400">Nenhum provedor configurado. Você precisa conectar uma conta para vender.</p>
                        <button 
                            className="connect-now-btn"
                            onClick={() => navigate('/financial/providers')}
                        >
                            CONFIGURAR AGORA
                        </button>
                    </div>
                )}

                <button 
                    className="w-full mt-6 py-2 text-gray-500 font-bold uppercase text-[10px] tracking-widest hover:text-white transition-colors"
                    onClick={onClose}
                >
                    Fechar
                </button>
            </div>
        </div>
    );
};
