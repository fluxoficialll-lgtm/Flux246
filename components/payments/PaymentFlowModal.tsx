
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SyncPayModel } from './SyncPayModel';
import { PayPalModel } from './PayPalModel';
import { StripeModel } from './StripeModel';
import { authService } from '../../services/authService';
import { geoService, GeoData } from '../../services/geoService';
import { ConversionResult } from '../../services/currencyService';
import { Group } from '../../types';

interface PaymentFlowModalProps {
    isOpen: boolean;
    onClose: () => void;
    group: Group;
    provider: 'syncpay' | 'paypal' | 'stripe';
    convertedPriceInfo: ConversionResult | null;
}

export const PaymentFlowModal: React.FC<PaymentFlowModalProps> = ({ isOpen, onClose, group, provider, convertedPriceInfo }) => {
    const navigate = useNavigate();
    const [status, setStatus] = useState<'detecting' | 'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [txId, setTxId] = useState('');
    const [geo, setGeo] = useState<GeoData | null>(null);

    // Efeito de detecção de IP/País (Apenas para Stripe)
    useEffect(() => {
        if (isOpen && provider === 'stripe') {
            handleDetection();
        } else {
            setStatus('idle');
        }
    }, [isOpen, provider]);

    const handleDetection = async () => {
        setStatus('detecting');
        try {
            const data = await geoService.detectCountry();
            setGeo(data);
            setStatus('idle');
        } catch (e) {
            setStatus('idle'); 
        }
    };

    const handleSuccess = () => setStatus('success');
    const handleError = (msg: string) => { setStatus('error'); setErrorMessage(msg); };

    const handleRedeem = () => {
        const email = authService.getCurrentUserEmail() || localStorage.getItem('guest_email_capture');
        if (!email) {
            sessionStorage.setItem('redirect_after_login', `/group-chat/${group.id}`);
            navigate('/register');
            return;
        }
        navigate(`/group-chat/${group.id}`, { replace: true });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/95 z-[100] flex justify-center items-center backdrop-blur-md animate-fade-in" 
             onClick={(e) => { if(e.target === e.currentTarget && status !== 'success' && status !== 'detecting') onClose(); }}>
            
            <style>{`
                .payment-modal-card { 
                    background: #0c0f14; padding: 30px 24px; border-radius: 20px; 
                    width: 90%; max-width: 380px; text-align: center;
                    border: 1px solid #00c2ff; box-shadow: 0 0 40px rgba(0, 194, 255, 0.2);
                    max-height: 90vh; overflow-y: auto;
                }
                .loader-box { padding: 40px 0; }
            `}</style>

            <div className="payment-modal-card animate-pop-in">
                {status === 'detecting' && (
                    <div className="loader-box">
                        <i className="fa-solid fa-earth-americas fa-spin text-3xl text-[#00c2ff] mb-4"></i>
                        <p className="text-gray-400 text-sm">Identificando sua região...</p>
                    </div>
                )}

                {status === 'idle' && (
                    <>
                        {provider === 'syncpay' && (
                            <SyncPayModel 
                                group={group} 
                                onSuccess={handleSuccess} 
                                onError={handleError} 
                                onTransactionId={setTxId} 
                            />
                        )}
                        {provider === 'paypal' && (
                            <PayPalModel 
                                group={group} 
                                convertedPriceInfo={convertedPriceInfo}
                                onSuccess={handleSuccess} 
                                onError={handleError} 
                                onTransactionId={setTxId} 
                            />
                        )}
                        {provider === 'stripe' && (
                            <StripeModel 
                                group={group} 
                                geo={geo} 
                                convertedPriceInfo={convertedPriceInfo}
                                onSuccess={handleSuccess} 
                                onError={handleError} 
                                onTransactionId={setTxId} 
                            />
                        )}
                    </>
                )}

                {status === 'success' && (
                    <div className="py-6 animate-fade-in">
                        <div className="w-20 h-20 bg-[#00ff82]/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-[#00ff82]">
                            <i className="fa-solid fa-check text-4xl text-[#00ff82]"></i>
                        </div>
                        <h2 className="text-2xl font-black text-white mb-2">PAGAMENTO APROVADO</h2>
                        <p className="text-gray-400 text-sm mb-8">Sua vaga na área VIP foi liberada com sucesso!</p>
                        <button onClick={handleRedeem} className="w-full py-4 bg-[#00ff82] text-black rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(0,255,130,0.3)]">
                            ACESSAR AGORA <i className="fa-solid fa-arrow-right ml-2"></i>
                        </button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="py-6">
                        <i className="fa-solid fa-circle-exclamation text-5xl text-red-500 mb-4"></i>
                        <p className="text-red-400 mb-6">{errorMessage}</p>
                        <button onClick={() => setStatus('idle')} className="w-full py-3 bg-white/5 text-white rounded-lg font-bold border border-white/10">
                            TENTAR NOVAMENTE
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
