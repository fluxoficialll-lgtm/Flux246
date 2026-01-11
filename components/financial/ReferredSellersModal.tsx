
import React, { useState, useMemo } from 'react';
import { ReferredSeller } from '../../types';

interface ReferredSellersModalProps {
    isOpen: boolean;
    onClose: () => void;
    sellers: ReferredSeller[];
    onDismissSeller: (sellerId: string) => void;
}

export const ReferredSellersModal: React.FC<ReferredSellersModalProps> = ({
    isOpen,
    onClose,
    sellers,
    onDismissSeller
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredSellers = useMemo(() => {
        return sellers.filter(s => 
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            s.username.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [sellers, searchTerm]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/90 z-[120] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <style>{`
                .sellers-modal-card {
                    width: 100%;
                    max-width: 400px;
                    background: #1a1e26;
                    border: 1px solid rgba(255, 215, 0, 0.3);
                    border-radius: 24px;
                    display: flex;
                    flex-direction: column;
                    max-height: 85vh;
                    overflow: hidden;
                    box-shadow: 0 0 50px rgba(255, 215, 0, 0.1);
                    animation: popIn 0.3s ease;
                }
                .search-wrapper {
                    position: relative;
                    padding: 20px;
                    background: rgba(255, 255, 255, 0.02);
                    border-bottom: 1px solid rgba(255, 215, 0, 0.1);
                }
                .search-wrapper i {
                    position: absolute;
                    left: 35px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #FFD700;
                }
                .search-input {
                    width: 100%;
                    background: #0c0f14;
                    border: 1px solid rgba(255, 215, 0, 0.2);
                    border-radius: 12px;
                    padding: 12px 12px 12px 40px;
                    color: #fff;
                    outline: none;
                    font-size: 14px;
                }
                .search-input:focus { border-color: #FFD700; }
                
                .sellers-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: 10px 0;
                }
                .seller-card-item {
                    display: flex;
                    align-items: center;
                    padding: 15px 20px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
                    transition: 0.2s;
                }
                .seller-card-item:hover { background: rgba(255, 215, 0, 0.03); }
                
                .seller-avatar {
                    width: 45px;
                    height: 45px;
                    border-radius: 50%;
                    border: 2px solid #FFD700;
                    object-fit: cover;
                    background: #333;
                }
                .seller-info { flex: 1; margin-left: 12px; min-width: 0; }
                .seller-name { font-weight: 700; font-size: 15px; color: #fff; display: block; }
                .seller-user { font-size: 12px; color: #888; }
                
                .seller-values { text-align: right; margin-left: 10px; }
                .value-earned { font-size: 14px; font-weight: 800; color: #00ff82; }
                .sales-count { font-size: 10px; color: #aaa; text-transform: uppercase; }

                .dismiss-btn {
                    padding: 6px 12px;
                    background: rgba(255, 77, 77, 0.1);
                    border: 1px solid rgba(255, 77, 77, 0.3);
                    color: #ff4d4d;
                    border-radius: 8px;
                    font-size: 10px;
                    font-weight: 800;
                    cursor: pointer;
                    margin-top: 5px;
                    text-transform: uppercase;
                    transition: 0.2s;
                }
                .dismiss-btn:hover { background: #ff4d4d; color: #fff; }

                .modal-footer {
                    padding: 15px;
                    text-align: center;
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                }
                .count-badge {
                    background: rgba(255, 215, 0, 0.1);
                    color: #FFD700;
                    padding: 4px 10px;
                    border-radius: 20px;
                    font-size: 11px;
                    font-weight: 700;
                }
            `}</style>

            <div className="sellers-modal-card">
                <div className="flex items-center justify-between px-5 pt-5">
                    <h2 className="text-lg font-bold text-white uppercase tracking-wider">
                        <i className="fa-solid fa-users mr-2 text-[#FFD700]"></i> Vendedores
                    </h2>
                    <span className="count-badge">{sellers.length} Indicados</span>
                </div>

                <div className="search-wrapper">
                    <i className="fa-solid fa-magnifying-glass"></i>
                    <input 
                        type="text" 
                        className="search-input" 
                        placeholder="Buscar por nome ou @usuário..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="sellers-list no-scrollbar">
                    {filteredSellers.length > 0 ? filteredSellers.map((seller) => (
                        <div key={seller.id} className="seller-card-item">
                            {seller.avatar ? (
                                <img src={seller.avatar} className="seller-avatar" alt="S" />
                            ) : (
                                <div className="seller-avatar flex items-center justify-center text-lg text-[#FFD700]">
                                    <i className="fa-solid fa-user"></i>
                                </div>
                            )}
                            <div className="seller-info">
                                <span className="seller-name truncate">{seller.name || 'Vendedor'}</span>
                                <span className="seller-user">@{seller.username}</span>
                                <div>
                                    <button 
                                        className="dismiss-btn"
                                        onClick={() => {
                                            if(window.confirm(`Deseja dispensar @${seller.username}? Você deixará de receber comissões sobre as vendas deste parceiro.`)) {
                                                onDismissSeller(seller.id);
                                            }
                                        }}
                                    >
                                        Dispensar Vendedor
                                    </button>
                                </div>
                            </div>
                            <div className="seller-values">
                                <div className="value-earned">R$ {seller.totalGenerated.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                <div className="sales-count">{seller.salesCount} vendas</div>
                            </div>
                        </div>
                    )) : (
                        <div className="text-center py-20 opacity-30">
                            <i className="fa-solid fa-user-slash text-4xl mb-4"></i>
                            <p className="text-sm">Nenhum vendedor encontrado.</p>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button 
                        className="w-full py-3 text-gray-500 font-bold uppercase text-xs hover:text-white transition-colors"
                        onClick={onClose}
                    >
                        Fechar Lista
                    </button>
                </div>
            </div>
        </div>
    );
};
