
import React, { useState } from 'react';

interface PixelSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { pixelId: string, pixelToken: string }) => void;
    initialData: { pixelId: string, pixelToken: string };
}

type ModalStep = 'selection' | 'meta_form';

export const PixelSettingsModal: React.FC<PixelSettingsModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
    const [step, setStep] = useState<ModalStep>('selection');
    const [pixelId, setPixelId] = useState(initialData.pixelId);
    const [pixelToken, setPixelToken] = useState(initialData.pixelToken);

    if (!isOpen) return null;

    const handleSelectMeta = () => setStep('meta_form');

    const handleSaveMeta = () => {
        onSave({ pixelId, pixelToken });
        onClose();
        setStep('selection');
    };

    return (
        <div className="fixed inset-0 bg-black/90 z-[110] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <style>{`
                .pixel-modal-card {
                    width: 100%;
                    max-width: 380px;
                    background: #1a1e26;
                    border: 1px solid rgba(0, 194, 255, 0.3);
                    border-radius: 24px;
                    padding: 30px 24px;
                    box-shadow: 0 0 50px rgba(0, 0, 0, 0.5);
                    animation: popIn 0.3s ease;
                }
                .pixel-option-btn {
                    width: 100%;
                    padding: 16px;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 14px;
                    color: #fff;
                    font-weight: 600;
                    margin-bottom: 12px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    cursor: pointer;
                    transition: 0.2s;
                    text-align: left;
                }
                .pixel-option-btn:hover {
                    background: rgba(0, 194, 255, 0.1);
                    border-color: #00c2ff;
                }
                .pixel-option-btn i {
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 8px;
                    font-size: 18px;
                }
                .pixel-input-group { margin-bottom: 15px; }
                .pixel-input-group label { display: block; font-size: 11px; color: #aaa; font-weight: 700; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px; }
                .pixel-field { width: 100%; background: #0c0f14; border: 1px solid #333; color: #fff; padding: 12px; border-radius: 12px; outline: none; font-size: 14px; }
                .pixel-field:focus { border-color: #00c2ff; }
                .pixel-save-btn { width: 100%; background: #00c2ff; color: #000; padding: 16px; border-radius: 14px; font-weight: 800; border: none; cursor: pointer; margin-top: 10px; }
            `}</style>

            <div className="pixel-modal-card">
                {step === 'selection' ? (
                    <>
                        <h2 className="text-xl font-bold text-white mb-6 text-center">Configurar Pixel</h2>
                        <button className="pixel-option-btn" onClick={() => alert('TikTok Pixel em breve!')}>
                            <i className="fa-brands fa-tiktok text-white"></i>
                            <span>1. TikTok Pixel</span>
                        </button>
                        <button className="pixel-option-btn" onClick={handleSelectMeta}>
                            <i className="fa-brands fa-facebook text-[#1877F2]"></i>
                            <span>2. Meta Pixel</span>
                        </button>
                        <button className="pixel-option-btn" onClick={() => alert('X Pixel em breve!')}>
                            <i className="fa-brands fa-x-twitter text-white"></i>
                            <span>3. (X Twitter)</span>
                        </button>
                        <button className="pixel-option-btn" onClick={() => alert('Google ADS em breve!')}>
                            <i className="fa-brands fa-google text-[#4285F4]"></i>
                            <span>4. Google ADS</span>
                        </button>
                        <button className="w-full text-gray-500 text-xs font-bold mt-4 uppercase hover:text-white" onClick={onClose}>Cancelar</button>
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-3 mb-6">
                            <button onClick={() => setStep('selection')} className="text-gray-400 hover:text-white"><i className="fa-solid fa-arrow-left"></i></button>
                            <h2 className="text-lg font-bold text-white">Configurar Meta Pixel</h2>
                        </div>

                        <div className="pixel-input-group">
                            <label>Meta Pixel ID (Opcional)</label>
                            <input 
                                type="text" 
                                className="pixel-field" 
                                placeholder="Ex: 123456789012345" 
                                value={pixelId}
                                onChange={e => setPixelId(e.target.value)}
                            />
                            <p className="text-[10px] text-gray-500 mt-1">Rastreie PageView e InitiateCheckout automaticamente.</p>
                        </div>

                        <div className="pixel-input-group">
                            <label>Token de Acesso (CAPI)</label>
                            <input 
                                type="text" 
                                className="pixel-field" 
                                placeholder="Cole seu token EAA..." 
                                value={pixelToken}
                                onChange={e => setPixelToken(e.target.value)}
                            />
                            <p className="text-[10px] text-gray-500 mt-1">Utilizado para eventos server-side via API de Conversões.</p>
                        </div>

                        <button className="pixel-save-btn" onClick={handleSaveMeta}>SALVAR CONFIGURAÇÃO</button>
                    </>
                )}
            </div>
        </div>
    );
};
