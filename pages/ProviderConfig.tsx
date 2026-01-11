
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { SyncPayForm } from '../components/payments/providers/SyncPayForm';
import { StripeForm } from '../components/payments/providers/StripeForm';
import { PayPalForm } from '../components/payments/providers/PayPalForm';

interface ProviderData {
    id: string;
    name: string;
    icon: string;
    isPrimary?: boolean;
    status: 'active' | 'coming_soon';
    methods: { type: 'pix' | 'card'; label: string }[];
}

export const ProviderConfig: React.FC = () => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [connectedProviders, setConnectedProviders] = useState<Set<string>>(new Set());

  const providers: ProviderData[] = useMemo(() => [
      {
          id: 'syncpay',
          name: 'SyncPay (Oficial)',
          icon: 'fa-bolt',
          isPrimary: true,
          status: 'active',
          methods: [
              { type: 'pix', label: 'PIX' }
          ]
      },
      {
          id: 'stripe',
          name: 'Stripe',
          icon: 'fa-brands fa-stripe',
          status: 'active',
          methods: [
              { type: 'card', label: 'Cartão' }
          ]
      },
      {
          id: 'paypal',
          name: 'PayPal',
          icon: 'fa-brands fa-paypal',
          status: 'active',
          methods: [
              { type: 'pix', label: 'PIX' },
              { type: 'card', label: 'Cartão' }
          ]
      },
      {
          id: 'picpay',
          name: 'PicPay',
          icon: 'fa-qrcode',
          status: 'coming_soon',
          methods: [
              { type: 'pix', label: 'PIX' },
              { type: 'card', label: 'Cartão' }
          ]
      }
  ], []);

  useEffect(() => {
      const loadConfig = () => {
          const user = authService.getCurrentUser();
          if (user) {
              const connected = new Set<string>();
              if (user.paymentConfig && user.paymentConfig.isConnected) {
                  connected.add(user.paymentConfig.providerId);
              }
              if (user.paymentConfigs) {
                  Object.values(user.paymentConfigs).forEach(conf => {
                      if (conf.isConnected) connected.add(conf.providerId);
                  });
              }
              setConnectedProviders(connected);
              
              // Se não houver nada expandido, tenta expandir o primeiro conectado ou o syncpay
              if (!expanded) {
                if (connected.size > 0) {
                    setExpanded(Array.from(connected)[0]);
                } else {
                    setExpanded('syncpay');
                }
              }
          }
      };
      loadConfig();
  }, [expanded]);

  const handleStatusChange = (providerId: string, connected: boolean) => {
      setConnectedProviders(prev => {
          const next = new Set(prev);
          if (connected) next.add(providerId);
          else next.delete(providerId);
          return next;
      });
  };

  const toggleProvider = (id: string) => {
      setExpanded(prev => prev === id ? null : id);
  };

  const handleBack = () => {
      if (window.history.state && window.history.state.idx > 0) {
          navigate(-1);
      } else {
          navigate('/financial');
      }
  };

  const connectedList = providers.filter(p => connectedProviders.has(p.id));
  const disconnectedList = providers.filter(p => !connectedProviders.has(p.id));

  const renderProvider = (provider: ProviderData) => {
    const isExpanded = expanded === provider.id;
    const isSoon = provider.status === 'coming_soon';
    const isConnected = connectedProviders.has(provider.id);

    return (
        <div key={provider.id} className={`provider-card ${provider.isPrimary ? 'primary' : ''}`} style={{ opacity: isSoon ? 0.8 : 1 }}>
            <div className="provider-header" onClick={() => toggleProvider(provider.id)}>
                <div className="provider-info">
                    <div className="provider-icon" style={{ filter: isSoon ? 'grayscale(100%)' : 'none' }}>
                        <i className={`fa-solid ${provider.icon}`}></i>
                    </div>
                    <div className="provider-name">
                        {provider.name}
                        <div className="method-indicators">
                            {provider.methods.map((m, i) => (
                                <div className="method-item" key={i}>
                                    <div className="method-dot"></div>
                                    {m.label}
                                </div>
                            ))}
                        </div>
                        {isSoon && <span className="badge-soon">Em Breve</span>}
                    </div>
                </div>
                <i className={`fa-solid fa-chevron-down arrow-icon ${isExpanded ? 'expanded' : ''}`}></i>
            </div>
            
            {isExpanded && (
                <div className="provider-body">
                    {isSoon ? (
                        <div className="coming-soon-body">
                            <i className="fa-solid fa-person-digging" style={{fontSize: '24px', marginBottom: '10px', display: 'block'}}></i>
                            Integração em desenvolvimento. <br/>
                            Disponível nas próximas atualizações.
                        </div>
                    ) : (
                        <>
                            {provider.id === 'syncpay' && (
                                <SyncPayForm isConnected={isConnected} onStatusChange={handleStatusChange} />
                            )}
                            {provider.id === 'stripe' && (
                                <StripeForm isConnected={isConnected} onStatusChange={handleStatusChange} />
                            )}
                            {provider.id === 'paypal' && (
                                <PayPalForm isConnected={isConnected} onStatusChange={handleStatusChange} />
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#0c0f14,_#0a0c10)] text-white font-['Inter'] flex flex-col overflow-x-hidden">
      <style>{`
        * { margin:0; padding:0; box-sizing:border-box; font-family:'Inter',sans-serif; }
        
        header {
            display:flex; align-items:center; justify-content:space-between; padding:16px;
            background: #0c0f14; position:fixed; width:100%; top:0; z-index:10;
            border-bottom:1px solid rgba(255,255,255,0.1); height: 65px;
        }
        header button {
            background:none; border:none; color:#fff; font-size:24px; cursor:pointer;
            transition:0.3s; padding-right: 15px;
        }
        header h1 { font-size:20px; font-weight:600; }
        
        main {
            padding-top: 90px; padding-bottom: 40px;
            width: 100%; max-width: 600px; margin: 0 auto; padding-left: 20px; padding-right: 20px;
        }

        .section-header {
            font-size: 12px;
            font-weight: 800;
            color: #555;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            margin-bottom: 15px;
            margin-top: 25px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .section-header:first-of-type { margin-top: 0; }
        .section-header span {
            flex-grow: 1;
            height: 1px;
            background: rgba(255,255,255,0.05);
        }
        
        .provider-card {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 16px;
            margin-bottom: 15px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            overflow: hidden;
            transition: all 0.3s ease;
        }
        
        .provider-card.primary {
            border: 1px solid #00c2ff;
            background: rgba(0, 194, 255, 0.05);
        }
        
        .provider-header {
            display: flex; align-items: center; justify-content: space-between;
            padding: 20px;
            cursor: pointer;
            background: rgba(255,255,255,0.02);
            transition: background 0.3s;
        }
        .provider-header:hover {
            background: rgba(255,255,255,0.05);
        }

        .provider-info {
            display: flex; align-items: center; gap: 15px;
        }
        
        .provider-icon {
            width: 40px; height: 40px; border-radius: 8px;
            background: rgba(0, 194, 255, 0.1); color: #00c2ff;
            display: flex; align-items: center; justify-content: center;
            font-size: 20px;
        }
        
        .provider-name {
            font-size: 16px; font-weight: 700; color: #fff;
            text-transform: uppercase; letter-spacing: 0.5px;
            display: flex; flex-direction: column;
        }

        .method-indicators {
            display: flex; gap: 10px; margin-top: 6px;
        }
        .method-item {
            display: flex; align-items: center; gap: 4px; font-size: 10px; color: #aaa;
        }
        .method-dot {
            width: 6px; height: 6px; border-radius: 50%; background: #00ff82; box-shadow: 0 0 5px #00ff82;
        }

        .arrow-icon {
            color: #00c2ff;
            transition: transform 0.3s ease;
            font-size: 18px;
        }
        .arrow-icon.expanded {
            transform: rotate(180deg);
        }
        
        .provider-body {
            padding: 0 20px 20px 20px;
            border-top: 1px solid rgba(255,255,255,0.05);
            animation: slideDown 0.3s ease-out;
        }

        @keyframes slideDown {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .badge-soon {
            background: rgba(255,255,255,0.1);
            color: #aaa;
            font-size: 10px;
            padding: 3px 8px;
            border-radius: 12px;
            font-weight: 600;
            border: 1px solid rgba(255,255,255,0.2);
            margin-top: 5px;
            align-self: flex-start;
        }
        
        .coming-soon-body {
            text-align: center;
            padding: 20px 0;
            color: #888;
            font-size: 14px;
        }
      `}</style>

      <header>
        <button onClick={handleBack} aria-label="Voltar">
            <i className="fa-solid fa-arrow-left"></i>
        </button>
        <h1>Provedores de Pagamento</h1>
        <div style={{width: '24px'}}></div>
      </header>

      <main>
        {/* SECTION: CONNECTED */}
        {connectedList.length > 0 && (
            <>
                <div className="section-header">
                    <i className="fa-solid fa-circle-check text-[#00ff82]"></i>
                    Provedores Conectados
                    <span></span>
                </div>
                {connectedList.map(renderProvider)}
            </>
        )}

        {/* SECTION: DISCONNECTED */}
        {disconnectedList.length > 0 && (
            <>
                <div className="section-header">
                    <i className="fa-solid fa-circle-xmark text-gray-600"></i>
                    Provedores Disponíveis
                    <span></span>
                </div>
                {disconnectedList.map(renderProvider)}
            </>
        )}
        
        {connectedList.length === 0 && disconnectedList.length === 0 && (
            <div className="text-center py-20 text-gray-600">
                <i className="fa-solid fa-plug-circle-exclamation text-4xl mb-4"></i>
                <p>Nenhum provedor disponível no momento.</p>
            </div>
        )}
      </main>
    </div>
  );
};
