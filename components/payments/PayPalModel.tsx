
import React, { useState, useEffect, useRef } from 'react';
import { paypalService } from '../../services/paypalService';
import { authService } from '../../services/authService';
import { metaPixelService } from '../../services/metaPixelService';
import { Group } from '../../types';
import { ConversionResult } from '../../services/currencyService';

interface PayPalModelProps {
    group: Group;
    onSuccess: () => void;
    onError: (msg: string) => void;
    onTransactionId: (id: string) => void;
    convertedPriceInfo: ConversionResult | null;
}

export const PayPalModel: React.FC<PayPalModelProps> = ({ group, onSuccess, onError, onTransactionId, convertedPriceInfo }) => {
    const [loading, setLoading] = useState(true);
    const pollingInterval = useRef<any>(null);

    useEffect(() => {
        initPayPal();
        return () => { if (pollingInterval.current) clearInterval(pollingInterval.current); };
    }, []);

    const initPayPal = async () => {
        const email = authService.getCurrentUserEmail() || localStorage.getItem('guest_email_capture');
        if (!email) { onError("E-mail necessário."); return; }

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

            const order = await paypalService.createOrder(translatedGroup, group.creatorEmail!);
            if (order.approvalLink) {
                onTransactionId(order.id);
                window.open(order.approvalLink, '_blank');
                setLoading(false);
                startPolling(order.id);
            }
        } catch (err: any) {
            onError(err.message || "Erro ao iniciar PayPal.");
        }
    };

    const startPolling = (orderId: string) => {
        pollingInterval.current = setInterval(async () => {
            try {
                const res = await paypalService.checkOrderStatus(orderId, group.creatorEmail!);
                if (res.status === 'paid') {
                    clearInterval(pollingInterval.current);
                    onSuccess();
                }
            } catch (e) {}
        }, 4000);
    };

    return (
        <div className="py-4 animate-fade-in text-center">
            <i className="fa-brands fa-paypal text-6xl text-[#003087] mb-4"></i>
            <h3 className="text-lg font-bold text-white mb-1">PayPal Checkout</h3>
            <p className="text-xs text-gray-500 mb-4">Total: {convertedPriceInfo?.formatted || '...'}</p>
            <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-sm text-gray-400">
                {loading ? (
                    <><i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Preparando gateway...</>
                ) : (
                    <><i className="fa-solid fa-spinner fa-spin mr-2"></i> Finalize na aba do PayPal...</>
                )}
            </div>
        </div>
    );
};
