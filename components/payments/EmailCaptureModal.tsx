
import React, { useState } from 'react';
import { metaPixelService } from '../../services/metaPixelService';

interface EmailCaptureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (email: string) => void;
    pixelId?: string;
    groupId?: string;
}

export const EmailCaptureModal: React.FC<EmailCaptureModalProps> = ({ isOpen, onClose, onSuccess, pixelId, groupId }) => {
    const [emailInput, setEmailInput] = useState('');
    const [emailError, setEmailError] = useState('');

    const handleGuestEmailSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const email = emailInput.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!emailRegex.test(email)) {
            setEmailError("Por favor, insira um e-mail válido.");
            return;
        }

        localStorage.setItem('guest_email_capture', email);
        if (pixelId && groupId) {
            metaPixelService.trackLead(pixelId, { email: email }, groupId);
        }
        onSuccess(email);
        setEmailError('');
    };

    if (!isOpen) return null;

    return (
        <div className="email-modal-overlay fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
            <style>{`
                .email-modal-content { width: 100%; max-width: 320px; background: #1a1e26; padding: 30px 20px; border-radius: 20px; border: 1px solid #00c2ff; box-shadow: 0 0 50px rgba(0, 194, 255, 0.2); text-align: center; }
                .email-input { width: 100%; background: #0c0f14; border: 1px solid #333; color: #fff; padding: 12px; border-radius: 10px; margin-top: 10px; outline: none; }
                .confirm-email-btn { width: 100%; background: #00c2ff; color: #000; padding: 14px; border-radius: 10px; font-weight: 700; border: none; cursor: pointer; margin-top: 15px; }
            `}</style>
            <div className="email-modal-content animate-pop-in">
                <div className="w-12 h-12 bg-[#00c2ff]/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#00c2ff]">
                    <i className="fa-solid fa-user-lock text-[#00c2ff] text-xl"></i>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Quase lá!</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-4">Informe seu e-mail para reservar sua vaga e prosseguir com a compra.</p>
                <form onSubmit={handleGuestEmailSubmit}>
                    <input 
                        type="email" 
                        placeholder="seu@email.com" 
                        className="email-input" 
                        value={emailInput} 
                        onChange={(e) => setEmailInput(e.target.value)} 
                        required 
                        autoFocus
                    />
                    {emailError && <p className="text-red-400 text-xs mt-2 text-left">{emailError}</p>}
                    <button type="submit" className="confirm-email-btn">PROSSEGUIR <i className="fa-solid fa-arrow-right ml-2"></i></button>
                </form>
            </div>
        </div>
    );
};
