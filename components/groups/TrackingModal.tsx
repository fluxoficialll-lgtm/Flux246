import React, { useState, useEffect } from 'react';
import { Group } from '../../types';
import { generateTrackingLinkModel } from '../../services/trackingService';

interface TrackingModalProps {
    isOpen: boolean;
    onClose: () => void;
    group: Group;
}

export const TrackingModal: React.FC<TrackingModalProps> = ({ isOpen, onClose, group }) => {
    const [utmSource, setUtmSource] = useState('facebook');
    const [utmMedium, setUtmMedium] = useState('cpc');
    const [utmCampaign, setUtmCampaign] = useState('');
    const [generatedLink, setGeneratedLink] = useState('');
    const [isCopied, setIsCopied] = useState(false);

    useEffect(() => {
        if (isOpen) {
            handleGenerate();
        }
    }, [isOpen, utmSource, utmMedium, utmCampaign]);

    const handleGenerate = () => {
        const result = generateTrackingLinkModel({
            destinationType: group.isVip ? 'VIP_GROUP_SALES' : 'GROUP_LANDING',
            groupId: group.id,
            params: {
                utm_source: utmSource,
                utm_medium: utmMedium,
                utm_campaign: utmCampaign
            }
        });
        setGeneratedLink(result.finalUrl);
    };

    const handleCopy = async () => {
        await navigator.clipboard.writeText(generatedLink);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <style>{`
                .tracking-modal-card {
                    width: 100%;
                    max-width: 380px;
                    background: #1a1e26;
                    border: 1px solid #00c2ff;
                    border-radius: 24px;
                    padding: 30px 24px;
                    box-shadow: 0 0 50px rgba(0, 194, 255, 0.2);
                    animation: popIn 0.3s ease;
                }
                .tracking-header { text-align: center; margin-bottom: 25px; }
                .tracking-icon { width: 60px; height: 60px; background: rgba(0, 194, 255, 0.1); border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px; color: #00c2ff; font-size: 24px; border: 1px solid rgba(0, 194, 255, 0.2); }
                .tracking-input-group { margin-bottom: 15px; }
                .tracking-input-group label { display: block; font-size: 11px; color: #aaa; font-weight: 700; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px; }
                .tracking-field { width: 100%; background: #0c0f14; border: 1px solid #333; color: #fff; padding: 12px; border-radius: 12px; outline: none; font-size: 14px; transition: 0.2s; }
                .tracking-field:focus { border-color: #00c2ff; }
                .tracking-result-box { background: #000; padding: 15px; border-radius: 12px; margin-top: 10px; border: 1px dashed #333; overflow-y: auto; max-height: 80px; word-break: break-all; font-family: monospace; font-size: 12px; color: #00ff82; }
                .tracking-copy-btn { width: 100%; background: #00c2ff; color: #000; padding: 16px; border-radius: 14px; font-weight: 800; border: none; cursor: pointer; margin-top: 20px; box-shadow: 0 4px 15px rgba(0, 194, 255, 0.3); transition: 0.2s; }
                .tracking-copy-btn:hover { transform: translateY(-2px); }
                .tracking-copy-btn.copied { background: #00ff82; }
            `}</style>
            <div className="tracking-modal-card">
                <div className="tracking-header">
                    <div className="tracking-icon"><i className="fa-solid fa-link"></i></div>
                    <h2 className="text-xl font-bold text-white">Link de Rastreamento</h2>
                    <p className="text-xs text-gray-500 mt-1">Gere links parametrizados para anúncios</p>
                </div>

                <div className="tracking-input-group">
                    <label>Origem (UTM Source)</label>
                    <select className="tracking-field" value={utmSource} onChange={e => setUtmSource(e.target.value)}>
                        <option value="facebook">Facebook Ads</option>
                        <option value="instagram">Instagram</option>
                        <option value="google">Google Ads</option>
                        <option value="tiktok">TikTok</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="email">E-mail Marketing</option>
                    </select>
                </div>

                <div className="tracking-input-group">
                    <label>Mídia (UTM Medium)</label>
                    <select className="tracking-field" value={utmMedium} onChange={e => setUtmMedium(e.target.value)}>
                        <option value="cpc">CPC (Pago)</option>
                        <option value="social">Social (Orgânico)</option>
                        <option value="referral">Referência</option>
                        <option value="story">Stories</option>
                        <option value="bio">Bio Link</option>
                    </select>
                </div>

                <div className="tracking-input-group">
                    <label>Campanha (UTM Campaign)</label>
                    <input 
                        type="text" 
                        className="tracking-field" 
                        placeholder="Ex: lancamento_verao" 
                        value={utmCampaign}
                        onChange={e => setUtmCampaign(e.target.value)}
                    />
                </div>

                <div className="mt-6">
                    <label className="text-[11px] font-bold text-gray-500 uppercase">Link Gerado</label>
                    <div className="tracking-result-box">{generatedLink}</div>
                </div>

                <button className={`tracking-copy-btn ${isCopied ? 'copied' : ''}`} onClick={handleCopy}>
                    {isCopied ? <><i className="fa-solid fa-check mr-2"></i> COPIADO!</> : <><i className="fa-solid fa-copy mr-2"></i> COPIAR LINK</>}
                </button>
                
                <button className="w-full text-gray-500 text-xs font-bold mt-4 uppercase hover:text-white transition-colors" onClick={onClose}>
                    Fechar
                </button>
            </div>
        </div>
    );
};
