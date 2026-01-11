
import React, { useState } from 'react';
import { stripeService } from '../../../services/stripeService';
import { authService } from '../../../services/authService';
import { PaymentProviderConfig } from '../../../types';

interface StripeFormProps {
    isConnected: boolean;
    onStatusChange: (providerId: string, connected: boolean) => void;
}

export const StripeForm: React.FC<StripeFormProps> = ({ isConnected, onStatusChange }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [secretKey, setSecretKey] = useState('');
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

    const handleConnect = async () => {
        if (!secretKey) {
            setFeedback({ type: 'error', message: 'Chave secreta é obrigatória.' });
            return;
        }

        setIsLoading(true);
        setFeedback({ type: null, message: '' });

        try {
            await stripeService.authenticate(secretKey);
            const config: PaymentProviderConfig = { 
                providerId: 'stripe', 
                clientSecret: secretKey, 
                isConnected: true 
            };
            await authService.updatePaymentConfig(config);
            onStatusChange('stripe', true);
            setFeedback({ type: 'success', message: 'Conectado à Stripe!' });
        } catch (err: any) {
            setFeedback({ type: 'error', message: err.message || 'Falha na conexão.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisconnect = async () => {
        if (!window.confirm("Deseja desconectar da Stripe?")) return;
        
        setIsLoading(true);
        try {
            await authService.updatePaymentConfig({ providerId: 'stripe', isConnected: false });
            onStatusChange('stripe', false);
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
                    <i className="fa-solid fa-circle-check"></i> Stripe Conectada
                </div>
                <p style={{fontSize:'13px', color:'#aaa', marginBottom:'10px'}}>
                    Sua conta está configurada para receber pagamentos internacionais.
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
                <label>Chave Secreta (sk_...)</label>
                <input 
                    type="password" 
                    placeholder="Sua Secret Key da Stripe" 
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
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
