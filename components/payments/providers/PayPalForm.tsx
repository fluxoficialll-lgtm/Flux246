
import React, { useState } from 'react';
import { paypalService } from '../../../services/paypalService';
import { authService } from '../../../services/authService';
import { PaymentProviderConfig } from '../../../types';

interface PayPalFormProps {
    isConnected: boolean;
    onStatusChange: (providerId: string, connected: boolean) => void;
}

export const PayPalForm: React.FC<PayPalFormProps> = ({ isConnected, onStatusChange }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [clientId, setClientId] = useState('');
    const [clientSecret, setClientSecret] = useState('');
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

    const handleConnect = async () => {
        if (!clientId || !clientSecret) {
            setFeedback({ type: 'error', message: 'Client ID e Secret Key são obrigatórios.' });
            return;
        }

        setIsLoading(true);
        setFeedback({ type: null, message: '' });

        try {
            await paypalService.authenticate(clientId, clientSecret);
            const config: PaymentProviderConfig = { 
                providerId: 'paypal', 
                clientId, 
                clientSecret, 
                isConnected: true 
            };
            await authService.updatePaymentConfig(config);
            onStatusChange('paypal', true);
            setFeedback({ type: 'success', message: 'Conectado ao PayPal!' });
        } catch (err: any) {
            setFeedback({ type: 'error', message: err.message || 'Falha na conexão.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisconnect = async () => {
        if (!window.confirm("Deseja desconectar do PayPal?")) return;
        
        setIsLoading(true);
        try {
            await authService.updatePaymentConfig({ providerId: 'paypal', isConnected: false });
            onStatusChange('paypal', false);
            setFeedback({ type: null, message: '' });
        } catch (e) {
            alert("Erro ao desconectar.");
        } finally {
            setIsLoading(false);
        }
    };

    if (isConnected) {
        return (
            <div className="animate-fade-in" style={{textAlign:'center', padding:'10px'}}>
                <div className="feedback-msg success" style={{justifyContent:'center', marginBottom:'15px'}}>
                    <i className="fa-solid fa-circle-check"></i> PayPal Conectado
                </div>
                <p style={{fontSize:'13px', color:'#aaa', marginBottom:'10px'}}>
                    Sua conta está configurada para receber via PayPal.
                </p>
                <button className="disconnect-btn" onClick={handleDisconnect} disabled={isLoading}>
                    {isLoading ? '...' : 'Desconectar Provedor'}
                </button>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <div className="input-group">
                <label>Client ID</label>
                <input 
                    type="text" 
                    placeholder="Seu Client ID do PayPal" 
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                />
            </div>
            <div className="input-group">
                <label>Secret Key</label>
                <input 
                    type="password" 
                    placeholder="Sua Secret Key do PayPal" 
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                />
            </div>
            
            <button className="save-btn" onClick={handleConnect} disabled={isLoading}>
                {isLoading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-plug"></i>} 
                {isLoading ? ' Verificando...' : ' Conectar Conta'}
            </button>

            {feedback.type && (
                <div className={`feedback-msg ${feedback.type}`}>
                    <i className={`fa-solid ${feedback.type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'}`}></i>
                    <strong>{feedback.message}</strong>
                </div>
            )}
        </div>
    );
};
