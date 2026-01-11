
import React, { useState, useEffect, useRef } from 'react';
import { stripeService } from '../../services/stripeService';
import { authService } from '../../services/authService';
import { metaPixelService } from '../../services/metaPixelService';
import { GeoData } from '../../services/geoService';
import { ConversionResult } from '../../services/currencyService';
import { Group } from '../../types';

interface StripeModelProps {
    group: Group;
    geo: GeoData | null;
    onSuccess: () => void;
    onError: (msg: string) => void;
    onTransactionId: (id: string) => void;
    convertedPriceInfo: ConversionResult | null;
}

interface PaymentMethod {
    id: string;
    label: string;
    icon: string;
    subLabel?: string;
    isPrimary?: boolean;
}

export const StripeModel: React.FC<StripeModelProps> = ({ group, geo, onSuccess, onError, onTransactionId, convertedPriceInfo }) => {
    const [view, setView] = useState<'options' | 'waiting'>('options');
    const pollingInterval = useRef<any>(null);

    const country = geo?.countryCode || 'BR';

    // Mapeamento de Métodos Localizados + Carteira Stripe Link
    const getMethodsByCountry = (code: string): PaymentMethod[] => {
        // Link é global e aparece no topo ou destaque
        const stripeLink: PaymentMethod = { 
            id: 'link', 
            label: 'Link (Stripe)', 
            icon: 'fa-solid fa-bolt-lightning', 
            subLabel: 'Pagamento instantâneo em 1-clique',
            isPrimary: true 
        };

        const genericWallets: PaymentMethod = {
            id: 'wallets',
            label: 'Apple / Google Pay',
            icon: 'fa-solid fa-wallet',
            subLabel: 'Carteiras digitais seguras'
        };

        switch (code) {
            case 'BR':
                return [
                    { id: 'pix', label: 'Pix Instantâneo', icon: 'fa-solid fa-pix', subLabel: 'Liberação imediata', isPrimary: true },
                    stripeLink,
                    { id: 'card', label: 'Cartão de Crédito', icon: 'fa-solid fa-credit-card', subLabel: 'Até 12x' },
                    genericWallets,
                    { id: 'boleto', label: 'Boleto Bancário', icon: 'fa-solid fa-barcode', subLabel: 'Compensação 1-2 dias' }
                ];
            case 'US':
                return [
                    stripeLink,
                    genericWallets,
                    { id: 'card', label: 'Credit Card', icon: 'fa-solid fa-credit-card', subLabel: 'All major flags' },
                    { id: 'us_bank_account', label: 'Bank Debit (ACH)', icon: 'fa-solid fa-building-columns', subLabel: 'Direct bank transfer' }
                ];
            case 'DE':
                return [
                    stripeLink,
                    { id: 'sofort', label: 'Sofort / Klarna', icon: 'fa-solid fa-university', subLabel: 'Direct Bank Transfer' },
                    { id: 'card', label: 'Credit / Debit Card', icon: 'fa-solid fa-credit-card' },
                    genericWallets,
                    { id: 'sepa_debit', label: 'SEPA Direct Debit', icon: 'fa-solid fa-euro-sign', subLabel: 'Euro account' }
                ];
            case 'GB':
                return [
                    stripeLink,
                    { id: 'card', label: 'Credit / Debit Card', icon: 'fa-solid fa-credit-card' },
                    genericWallets,
                    { id: 'klarna', label: 'Klarna (BNPL)', icon: 'fa-solid fa-layer-group', subLabel: 'Pay later or installments' },
                    { id: 'clearpay', label: 'Clearpay (BNPL)', icon: 'fa-solid fa-clock-rotate-left', subLabel: 'Buy now, pay later' },
                    { id: 'bacs_debit', label: 'BACS Direct Debit', icon: 'fa-solid fa-pound-sign', subLabel: 'UK Bank Account' }
                ];
            case 'IN':
                return [
                    { id: 'upi', label: 'UPI (Real-Time)', icon: 'fa-solid fa-mobile-screen', subLabel: 'VPA / Mobile', isPrimary: true },
                    { id: 'netbanking', label: 'Net Banking', icon: 'fa-solid fa-network-wired', subLabel: 'All major Indian banks' },
                    stripeLink,
                    genericWallets,
                    { id: 'card', label: 'International Card', icon: 'fa-solid fa-credit-card' }
                ];
            case 'JP':
                return [
                    stripeLink,
                    { id: 'card', label: 'Credit Card', icon: 'fa-solid fa-credit-card' },
                    { id: 'konbini', label: 'Konbini', icon: 'fa-solid fa-store', subLabel: 'Convenience Store Pay' },
                    genericWallets,
                    { id: 'customer_balance', label: 'Bank Transfer', icon: 'fa-solid fa-university', subLabel: 'Japanese Bank (Furikomi)' }
                ];
            case 'CA':
                return [
                    stripeLink,
                    { id: 'card', label: 'Credit Card', icon: 'fa-solid fa-credit-card' },
                    genericWallets,
                    { id: 'acss_debit', label: 'Pre-authorized Debit', icon: 'fa-solid fa-money-bill-transfer', subLabel: 'Canada PAD' }
                ];
            default:
                return [
                    stripeLink,
                    genericWallets,
                    { id: 'card', label: 'International Card', icon: 'fa-solid fa-credit-card' }
                ];
        }
    };

    const methods = getMethodsByCountry(country);

    useEffect(() => {
        return () => { if (pollingInterval.current) clearInterval(pollingInterval.current); };
    }, []);

    const handleStripeStart = async (methodId: string) => {
        const email = authService.getCurrentUserEmail() || localStorage.getItem('guest_email_capture');
        if (!email) { onError("E-mail necessário."); return; }

        setView('waiting');
        try {
            const finalValue = convertedPriceInfo?.amount || parseFloat(group.price || '0');
            const finalCurrency = convertedPriceInfo?.currency || group.currency || 'BRL';

            if (group.pixelId) {
                metaPixelService.trackInitiateCheckout(group.pixelId, {
                    content_ids: [group.id],
                    content_type: 'product_group',
                    content_name: group.name,
                    value: finalValue,
                    currency: finalCurrency
                }, { email });
            }

            const translatedGroup = {
                ...group,
                price: finalValue.toString(),
                currency: finalCurrency as any
            };

            const session = await stripeService.createCheckoutSession(translatedGroup, group.creatorEmail!);
            if (session.url) {
                onTransactionId(session.id);
                window.open(session.url, '_blank');
                startPolling(session.id);
            }
        } catch (err: any) {
            onError(err.message || "Erro ao iniciar Stripe.");
            setView('options');
        }
    };

    const startPolling = (sessionId: string) => {
        pollingInterval.current = setInterval(async () => {
            try {
                const res = await stripeService.checkSessionStatus(sessionId, group.creatorEmail!);
                if (res.status === 'paid') {
                    clearInterval(pollingInterval.current);
                    onSuccess();
                }
            } catch (e) {}
        }, 4000);
    };

    if (view === 'waiting') {
        return (
            <div className="py-6 text-center animate-fade-in">
                <i className="fa-brands fa-stripe text-6xl text-[#635bff] mb-4"></i>
                <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-sm text-gray-400">
                    <i className="fa-solid fa-spinner fa-spin mr-2"></i> Aguardando confirmação...
                </div>
                <p className="text-[10px] text-gray-600 mt-4 px-6">Conclua o pagamento na aba aberta da Stripe.</p>
                <button onClick={() => setView('options')} className="mt-4 text-[10px] text-blue-400 underline">Voltar e escolher outro método</button>
            </div>
        );
    }

    return (
        <div className="py-2 animate-fade-in">
            <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-[20px]">{geo?.countryCode === 'BR' ? '🇧🇷' : '🌍'}</span>
                <span className="text-[10px] font-bold text-[#00c2ff] uppercase tracking-widest">{geo?.countryName || 'Global'} Global Checkout</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Pagamento Localizado</h3>
            <p className="text-xs text-gray-500 mb-6">Total: {convertedPriceInfo?.formatted || '...'}</p>
            
            <div className="space-y-2.5">
                {methods.map((m) => (
                    <div 
                        key={m.id}
                        onClick={() => handleStripeStart(m.id)} 
                        className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all active:scale-95 ${m.isPrimary ? 'bg-[#00c2ff]/10 border-2 border-[#00c2ff]' : 'bg-white/5 border border-white/10 hover:border-[#00c2ff] hover:bg-white/10'}`}
                    >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${m.isPrimary ? 'bg-[#00c2ff] text-black' : 'bg-white/5 text-[#00c2ff]'}`}>
                            <i className={`${m.icon} text-xl`}></i>
                        </div>
                        <div className="text-left">
                            <span className="font-bold text-sm block">{m.label}</span>
                            {m.subLabel && <span className="text-[9px] text-gray-500 uppercase tracking-tighter">{m.subLabel}</span>}
                        </div>
                        <i className="fa-solid fa-chevron-right ml-auto text-[10px] text-gray-600"></i>
                    </div>
                ))}
            </div>

            <div className="mt-8 text-[10px] text-gray-600 uppercase tracking-widest flex items-center justify-center gap-2">
                <i className="fa-brands fa-stripe text-base"></i> SECURE STRIPE GATEWAY
            </div>
        </div>
    );
};
