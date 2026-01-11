
import React, { useState } from 'react';
import { syncPayService } from '../../../services/syncPayService';
import { authService } from '../../../services/authService';
import { PaymentProviderConfig } from '../../../types';

interface SyncPayFormProps {
    isConnected: boolean;
    onStatusChange: (providerId: string, connected: boolean) => void;
}

export const SyncPayForm: React.FC<SyncPayFormProps> = ({ isConnected, onStatusChange }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [clientId, setClientId] = useState('');
    const [clientSecret, setClientSecret] = useState('');
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

    const handleConnect = async () => {
        if (!clientId || !clientSecret) {
            setFeedback({ type: 'error', message: 'Preencha a Chave Pública e a Chave Privada.' });
            return;
        }

        setIsLoading(true);
        setFeedback({ type: null, message: '' });

        try {
            await syncPayService.authenticate(clientId, clientSecret);
            const config: PaymentProviderConfig = { 
                providerId: 'syncpay', 
                clientId, 
                clientSecret, 
                isConnected: true 
            };
            await authService.updatePaymentConfig(config);
            onStatusChange('syncpay', true);
            setFeedback({ type: 'success', message: 'Conectado ao SyncPay!' });
        } catch (err: any) {
            setFeedback({ type: 'error', message: err.message || 'Falha na conexão.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisconnect = async () => {
        if (!window.confirm("Deseja desconectar do SyncPay? Seus grupos VIP deixarão de aceitar pagamentos por este método.")) return;
        
        setIsLoading(true);
        try {
            await authService.updatePaymentConfig({ providerId: 'syncpay', isConnected: false });
            onStatusChange('syncpay', false);
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
                    <i className="fa-solid fa-circle-check"></i> SyncPay Conectado
                </div>
                <p style={{fontSize:'13px', color:'#aaa', marginBottom:'10px'}}>
                    Sua conta está configurada para receber pagamentos via Pix.
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
                <label>Chave Pública (Client ID)</label>
                <input 
                    type="text" 
                    placeholder="Cole sua Chave Pública aqui" 
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                />
            </div>
            <div className="input-group">
                <label>Chave Privada (Client Secret)</label>
                <input 
                    type="password" 
                    placeholder="Cole sua Chave Privada aqui" 
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
