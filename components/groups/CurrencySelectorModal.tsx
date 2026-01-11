
import React from 'react';

type CurrencyType = 'BRL' | 'USD' | 'EUR' | 'BTC' | 'GBP';

interface CurrencySelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentCurrency: CurrencyType;
    onSelect: (currency: CurrencyType) => void;
}

export const CurrencySelectorModal: React.FC<CurrencySelectorModalProps> = ({ isOpen, onClose, currentCurrency, onSelect }) => {
    if (!isOpen) return null;

    const currencies: { id: CurrencyType; label: string; symbol: string; icon: string; color: string }[] = [
        { id: 'BRL', label: 'Real Brasileiro', symbol: 'R$', icon: 'fa-brazil', color: '#00ff82' },
        { id: 'USD', label: 'Dólar Americano', symbol: '$', icon: 'fa-dollar-sign', color: '#00c2ff' },
        { id: 'EUR', label: 'Euro', symbol: '€', icon: 'fa-euro-sign', color: '#ffd700' },
        { id: 'BTC', label: 'Bitcoin', symbol: '₿', icon: 'fa-brands fa-bitcoin', color: '#f7931a' },
        { id: 'GBP', label: 'Libra Esterlina', symbol: '£', icon: 'fa-sterling-sign', color: '#ff4d4d' }
    ];

    return (
        <div className="fixed inset-0 bg-black/90 z-[120] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <style>{`
                .currency-modal-card {
                    width: 100%;
                    max-width: 360px;
                    background: #1a1e26;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 24px;
                    padding: 30px 20px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
                    animation: popIn 0.3s ease;
                }
                .currency-option {
                    width: 100%;
                    padding: 14px 18px;
                    background: rgba(255, 255, 255, 0.03);
                    border: 2px solid transparent;
                    border-radius: 16px;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    cursor: pointer;
                    transition: 0.2s;
                    margin-bottom: 10px;
                    text-align: left;
                }
                .currency-option:hover {
                    background: rgba(255, 255, 255, 0.06);
                }
                .currency-option.active {
                    border-color: #00c2ff;
                    background: rgba(0, 194, 255, 0.05);
                }
                .curr-icon-box {
                    width: 40px;
                    height: 40px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                    flex-shrink: 0;
                }
                .curr-info { flex-grow: 1; }
                .curr-info h4 { font-size: 15px; font-weight: 700; color: #fff; margin: 0; }
                .curr-info span { font-size: 12px; color: #888; font-weight: 500; }
            `}</style>
            <div className="currency-modal-card">
                <h2 className="text-xl font-bold text-center mb-6 text-white">Moeda do Grupo</h2>
                
                <div className="space-y-1">
                    {currencies.map((curr) => (
                        <button 
                            key={curr.id}
                            className={`currency-option ${currentCurrency === curr.id ? 'active' : ''}`}
                            onClick={() => { onSelect(curr.id); onClose(); }}
                        >
                            <div className="curr-icon-box" style={{ background: `${curr.color}1a`, color: curr.color }}>
                                <i className={`fa-solid ${curr.icon}`}></i>
                            </div>
                            <div className="curr-info">
                                <h4>{curr.label}</h4>
                                <span>{curr.symbol} • {curr.id}</span>
                            </div>
                            {currentCurrency === curr.id && (
                                <i className="fa-solid fa-circle-check text-[#00c2ff]"></i>
                            )}
                        </button>
                    ))}
                </div>

                <button 
                    className="w-full mt-6 py-3 text-gray-500 font-bold uppercase text-xs hover:text-white transition-colors"
                    onClick={onClose}
                >
                    Fechar
                </button>
            </div>
        </div>
    );
};
