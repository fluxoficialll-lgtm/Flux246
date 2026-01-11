
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

export const Banned: React.FC = () => {
    const navigate = useNavigate();
    const [reason, setReason] = useState('Violação das diretrizes da comunidade.');
    const user = authService.getCurrentUser();

    useEffect(() => {
        if (user && user.isBanned) {
            setReason(user.banReason || 'Violação das diretrizes da comunidade.');
        } else if (user && !user.isBanned) {
            navigate('/feed', { replace: true });
        } else if (!user) {
            navigate('/', { replace: true });
        }
    }, [user, navigate]);

    const handleLogout = () => {
        authService.logout();
        navigate('/', { replace: true });
    };

    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-[#050505] text-white font-['Inter'] p-6 relative overflow-hidden">
            <style>{`
                .ban-glow {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 300px;
                    height: 300px;
                    background: radial-gradient(circle, rgba(255, 0, 0, 0.1) 0%, transparent 70%);
                    z-index: 1;
                    pointer-events: none;
                }
                .ban-card {
                    background: rgba(20, 20, 20, 0.8);
                    border: 1px solid rgba(255, 77, 77, 0.3);
                    border-radius: 24px;
                    padding: 40px 30px;
                    width: 100%;
                    max-width: 400px;
                    text-align: center;
                    backdrop-filter: blur(10px);
                    z-index: 2;
                    box-shadow: 0 0 40px rgba(255, 0, 0, 0.1);
                }
                .ban-icon {
                    width: 80px;
                    height: 80px;
                    background: rgba(255, 77, 77, 0.1);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 20px auto;
                    color: #ff4d4d;
                    font-size: 32px;
                    border: 2px solid rgba(255, 77, 77, 0.2);
                }
                .reason-box {
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 12px;
                    padding: 15px;
                    margin: 20px 0;
                    border-left: 4px solid #ff4d4d;
                    text-align: left;
                }
                .logout-btn {
                    width: 100%;
                    padding: 14px;
                    background: transparent;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: #aaa;
                    border-radius: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: 0.3s;
                }
                .logout-btn:hover {
                    background: rgba(255, 255, 255, 0.05);
                    color: #fff;
                    border-color: #fff;
                }
                .support-link {
                    margin-top: 20px;
                    font-size: 13px;
                    color: #555;
                }
                .support-link a {
                    color: #ff4d4d;
                    text-decoration: none;
                }
            `}</style>

            <div className="ban-glow"></div>

            <div className="ban-card">
                <div className="ban-icon">
                    <i className="fa-solid fa-user-slash"></i>
                </div>
                
                <h1 className="text-2xl font-bold text-white mb-2">Conta Suspensa</h1>
                <p className="text-gray-400 text-sm leading-relaxed">
                    Detectamos atividades que violam nossos Termos de Serviço. O acesso a esta conta foi restrito permanentemente.
                </p>

                <div className="reason-box">
                    <div className="text-[10px] text-red-400 font-bold uppercase tracking-wider mb-1">Motivo Oficial</div>
                    <div className="text-sm text-gray-200 italic">"{reason}"</div>
                </div>

                <button onClick={handleLogout} className="logout-btn">
                    <i className="fa-solid fa-arrow-right-from-bracket mr-2"></i> Sair do Aplicativo
                </button>

                <div className="support-link">
                    Acha que cometemos um erro? <br/>
                    <a href="mailto:support@flux.com">Contestar decisão</a>
                </div>
            </div>
            
            <div className="mt-8 text-[10px] text-gray-700 font-bold uppercase tracking-[3px] z-10">
                FLUX SECURITY SYSTEM
            </div>
        </div>
    );
};
