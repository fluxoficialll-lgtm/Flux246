
import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { syncPayService } from '../../services/syncPayService';
import { authService } from '../../services/authService';
import { metaPixelService } from '../../services/metaPixelService';
import { currencyService } from '../../services/currencyService';
import { Group, User } from '../../types';

interface SyncPayModelProps {
    group: Group;
    onSuccess: () => void;
    onError: (msg: string) => void;
    onTransactionId: (id: string) => void;
}

export const SyncPayModel: React.FC<SyncPayModelProps> = ({ group, onSuccess, onError, onTransactionId }) => {
    const [method, setMethod] = useState<'pix' | 'boleto'>('pix');
    const [pixCode, setPixCode] = useState('');
    const [pixImage, setPixImage] = useState<string | undefined>(undefined);
    const [boletoUrl, setBoletoUrl] = useState('');
    const [isCopied, setIsCopied] = useState(false);
    const [loading, setLoading] = useState(false);
    const [initialized, setInitialized] = useState(false);
    const pollingInterval = useRef<any>(null);

    useEffect(() => {
        return () => { if (pollingInterval.current) clearInterval(pollingInterval.current); };
    }, []);

    const generatePayment = async (selectedMethod: 'pix' | 'boleto') => {
        setLoading(true);
        setMethod(selectedMethod);
        
        const user = authService.getCurrentUser();
        const guestEmail = localStorage.getItem('guest_email_capture');
        if (!user && !guestEmail) { onError("E-mail não identificado."); return; }
        const email = user?.email || guestEmail!;

        try {
            const baseCurrency = group.currency || 'BRL';
            const basePrice = parseFloat(group.price || '0');
            
            let finalBrlAmount = basePrice;
            if (baseCurrency !== 'BRL') {
                const conversion = await currencyService.convert(basePrice, baseCurrency, 'BRL');
                finalBrlAmount = conversion.amount;
            }

            if (group.pixelId) {
                metaPixelService.trackInitiateCheckout(group.pixelId, {
                    content_ids: [group.id],
                    content_type: 'product_group',
                    content_name: group.name,
                    value: finalBrlAmount,
                    currency: 'BRL'
                }, { email });
            }

            const syncGroup = { ...group, price: finalBrlAmount.toString(), currency: 'BRL' as const };
            const { pixCode, identifier, qrCodeImage, boletoUrl } = await syncPayService.createPayment({ email } as User, syncGroup, selectedMethod);
            
            setPixCode(pixCode);
            setPixImage(qrCodeImage);
            setBoletoUrl(boletoUrl);
            onTransactionId(identifier);
            setLoading(false);
            setInitialized(true);
            startPolling(identifier, email);
        } catch (error: any) {
            onError(error.message || "Erro ao gerar pagamento.");
            setLoading(false);
        }
    };

    const startPolling = (id: string, email: string) => {
        if (pollingInterval.current) clearInterval(pollingInterval.current);
        pollingInterval.current = setInterval(async () => {
            try {
                const res = await syncPayService.checkTransactionStatus(id, group.creatorEmail!, group.id, email);
                if (res.status === 'completed' || res.status === 'paid') {
                    clearInterval(pollingInterval.current);
                    onSuccess();
                }
            } catch (e) {}
        }, 3000);
    };

    const copyPix = async () => {
        await navigator.clipboard.writeText(pixCode);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    if (!initialized && !loading) {
        return (
            <div className="animate-fade-in">
                <h3 className="text-lg font-bold text-white mb-4">Escolha como pagar</h3>
                <div className="space-y-3">
                    <button 
                        onClick={() => generatePayment('pix')}
                        className="w-full p-4 bg-white/5 border border-white/10 rounded-xl flex items-center gap-4 hover:bg-white/10 transition-all"
                    >
                        <div className="w-10 h-10 bg-[#00c2ff]/10 rounded-lg flex items-center justify-center text-[#00c2ff]">
                            <i className="fa-solid fa-pix text-xl"></i>
                        </div>
                        <div className="text-left">
                            <div className="font-bold text-sm">Pix Instantâneo</div>
                            <div className="text-[10px] text-gray-500">Liberação imediata</div>
                        </div>
                        <i className="fa-solid fa-chevron-right ml-auto text-gray-600 text-xs"></i>
                    </button>
                    
                    <button 
                        onClick={() => generatePayment('boleto')}
                        className="w-full p-4 bg-white/5 border border-white/10 rounded-xl flex items-center gap-4 hover:bg-white/10 transition-all"
                    >
                        <div className="w-10 h-10 bg-[#aaa]/10 rounded-lg flex items-center justify-center text-[#aaa]">
                            <i className="fa-solid fa-barcode text-xl"></i>
                        </div>
                        <div className="text-left">
                            <div className="font-bold text-sm">Boleto Bancário</div>
                            <div className="text-[10px] text-gray-500">Compensação em até 48h</div>
                        </div>
                        <i className="fa-solid fa-chevron-right ml-auto text-gray-600 text-xs"></i>
                    </button>
                </div>
            </div>
        );
    }

    if (loading) return <div className="py-10 text-center"><i className="fa-solid fa-circle-notch fa-spin text-3xl text-[#00c2ff] mb-2"></i><p className="text-xs text-gray-500">Gerando seu {method === 'pix' ? 'Pix' : 'Boleto'}...</p></div>;

    return (
        <div className="animate-fade-in">
            {method === 'pix' ? (
                <>
                    <h3 className="text-lg font-bold text-[#00c2ff] mb-2">Pagar com Pix</h3>
                    <div className="bg-white p-2.5 rounded-xl mb-4 inline-block shadow-lg">
                        {pixImage ? <img src={pixImage} className="w-[180px]" alt="QR" /> : <QRCodeSVG value={pixCode} size={180} />}
                    </div>
                    <textarea 
                        readOnly 
                        className="w-full bg-[#1a1f26] text-white p-3 rounded-lg text-[10px] font-mono border border-dashed border-[#00c2ff] h-20 resize-none mb-4 outline-none" 
                        value={pixCode} 
                    />
                    <button onClick={copyPix} className="w-full py-3 bg-[#00c2ff] text-black rounded-lg font-bold shadow-lg">
                        {isCopied ? 'CÓDIGO COPIADO!' : 'COPIAR CÓDIGO PIX'}
                    </button>
                </>
            ) : (
                <>
                    <h3 className="text-lg font-bold text-white mb-2">Boleto Gerado</h3>
                    <i className="fa-solid fa-file-pdf text-6xl text-red-500 my-6"></i>
                    <p className="text-gray-400 text-xs mb-6 px-4">Seu boleto foi gerado. Você pode pagar em qualquer banco ou casa lotérica.</p>
                    <button 
                        onClick={() => window.open(boletoUrl, '_blank')} 
                        className="w-full py-4 bg-white text-black rounded-lg font-bold flex items-center justify-center gap-2"
                    >
                        <i className="fa-solid fa-download"></i> ABRIR BOLETO (PDF)
                    </button>
                    <button 
                        onClick={() => setInitialized(false)} 
                        className="mt-4 text-[10px] text-[#00c2ff] underline"
                    >
                        Trocar método de pagamento
                    </button>
                </>
            )}
            
            <div className="text-[10px] text-gray-500 mt-6 animate-pulse">
                <i className="fa-solid fa-spinner fa-spin mr-2"></i>Aguardando confirmação do banco...
            </div>
        </div>
    );
};
