
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { groupService } from '../services/groupService';
import { authService } from '../services/authService';
import { db } from '@/database';
import { Group } from '../types';

export const TopGroups: React.FC = () => {
  const navigate = useNavigate();
  const { category } = useParams<{ category: string }>();
  
  // Normaliza a categoria vinda da URL ou define padrão
  const activeTab = (category === 'private' || category === 'vip' || category === 'public') 
    ? category 
    : 'public';

  const [rankedGroups, setRankedGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  // Efeito principal: Dispara sempre que a categoria na URL mudar
  useEffect(() => {
    loadData();

    // Sincronização em tempo real (Reatividade local)
    const unsubscribe = db.subscribe('groups', () => loadData(true));
    return () => unsubscribe();
  }, [activeTab]);

  const loadData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    
    try {
        // Busca dados reais do servidor usando o endpoint de ranking
        const filtered = await groupService.getAllGroupsForRanking(activeTab);
        setRankedGroups(filtered);
    } catch (e) {
        console.error("Erro ao carregar ranking", e);
    } finally {
        setLoading(false);
    }
  };

  const handleTabChange = (newTab: string) => {
      if (newTab === activeTab) return;
      setRankedGroups([]); // Limpa dados atuais para evitar "fantasma" do ranking anterior
      navigate(`/top-groups/${newTab}`);
  };

  const handleGroupAction = (group: Group) => {
      const currentUserId = authService.getCurrentUserId();
      if (!currentUserId) {
          alert('Você precisa estar logado para acessar os grupos.');
          return;
      }

      const isMember = group.memberIds?.includes(currentUserId);

      if (isMember) {
          navigate(`/group-chat/${group.id}`);
      } else {
          if (group.isVip) {
              navigate(`/vip-group-sales/${group.id}`);
          } else {
              navigate(`/group-landing/${group.id}`);
          }
      }
  };

  const getActionButton = (group: Group) => {
      const currentUserId = authService.getCurrentUserId();
      const isMember = group.memberIds?.includes(currentUserId || '');

      if (isMember) {
          return <button className="action-btn open-btn">Acessar</button>;
      }

      return <button className="action-btn join-btn">Explorar</button>;
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#0c0f14,_#0a0c10)] text-white font-['Inter'] flex flex-col overflow-x-hidden">
      <style>{`
        * { margin:0; padding:0; box-sizing:border-box; font-family:'Inter',sans-serif; }
        
        header {
            display:flex; align-items:center; padding:16px;
            background: #0c0f14; position:fixed; width:100%; z-index:10;
            border-bottom:1px solid rgba(255,255,255,0.1); top: 0; height: 65px;
        }
        header button {
            background:none; border:none; color:#fff; font-size:22px; cursor:pointer;
            transition:0.3s; padding-right: 15px;
        }
        header h1 { font-size:20px; font-weight:700; color: #FFD700; text-transform: uppercase; letter-spacing: 1px; }
        
        main {
            padding-top: 80px; padding-bottom: 40px;
            width: 100%; max-width: 600px; margin: 0 auto; padding-left: 20px; padding-right: 20px;
        }

        /* Tabs */
        .tabs-container {
            display: flex; background: rgba(255,255,255,0.05); border-radius: 12px; padding: 4px;
            margin-bottom: 30px; border: 1px solid rgba(255,255,255,0.1);
        }
        .tab-btn {
            flex: 1; padding: 10px; border: none; background: transparent; color: #aaa;
            font-size: 13px; font-weight: 600; cursor: pointer; border-radius: 8px; transition: 0.3s;
        }
        .tab-btn.active {
            background: #00c2ff; color: #000; box-shadow: 0 2px 10px rgba(0,194,255,0.3);
        }

        /* Podium */
        .top-three-container {
            display: flex; justify-content: center; align-items: flex-end; margin-bottom: 40px; gap: 10px;
        }

        .podium-item {
            display: flex; flex-direction: column; align-items: center; cursor: pointer;
            transition: transform 0.3s; position: relative; width: 33%;
        }
        .podium-item:hover { transform: translateY(-5px); }

        .podium-cover-wrapper {
            position: relative; margin-bottom: 10px;
        }
        
        .podium-cover {
            border-radius: 16px; object-fit: cover; background: #333;
            display: flex; align-items: center; justify-content: center; color: #555;
            overflow: hidden;
        }
        .podium-cover i { font-size: 24px; }
        .podium-cover img { width: 100%; height: 100%; object-fit: cover; }
        
        .crown-icon {
            position: absolute; top: -25px; left: 50%; transform: translateX(-50%);
            font-size: 24px; filter: drop-shadow(0 0 5px rgba(0,0,0,0.8));
        }

        .rank-badge {
            position: absolute; bottom: -10px; left: 50%; transform: translateX(-50%);
            width: 24px; height: 24px; border-radius: 50%; color: #000; font-weight: 800; font-size: 14px;
            display: flex; align-items: center; justify-content: center; border: 2px solid #0c0f14;
        }

        .podium-name {
            text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; 
            width: 100%; margin-top: 5px; padding: 0 5px;
        }

        /* 1st Place */
        .first-place .podium-cover { width: 100px; height: 100px; border: 4px solid #FFD700; box-shadow: 0 0 25px rgba(255, 215, 0, 0.4); }
        .first-place .crown-icon { color: #FFD700; font-size: 32px; }
        .first-place .rank-badge { background: #FFD700; }
        .first-place .podium-name { color: #FFD700; font-size: 16px; font-weight: 700; }
        
        /* 2nd Place */
        .second-place .podium-cover { width: 80px; height: 80px; border: 3px solid #C0C0C0; box-shadow: 0 0 15px rgba(192, 192, 192, 0.3); }
        .second-place .crown-icon { color: #C0C0C0; }
        .second-place .rank-badge { background: #C0C0C0; }
        .second-place .podium-name { color: #C0C0C0; font-size: 14px; font-weight: 600; }

        /* 3rd Place */
        .third-place .podium-cover { width: 80px; height: 80px; border: 3px solid #CD7F32; box-shadow: 0 0 15px rgba(205, 127, 50, 0.3); }
        .third-place .crown-icon { color: #CD7F32; }
        .third-place .rank-badge { background: #CD7F32; }
        .third-place .podium-name { color: #CD7F32; font-size: 14px; font-weight: 600; }

        .podium-count { font-size: 12px; color: #aaa; margin-top: 2px; }

        /* Standard List */
        .rank-list { display: flex; flex-direction: column; gap: 10px; }
        .rank-item {
            display: flex; align-items: center; padding: 15px; background: rgba(255,255,255,0.03);
            border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);
            transition: background 0.2s; cursor: pointer;
        }
        .rank-item:hover { background: rgba(255,255,255,0.06); }
        
        .rank-number {
            font-size: 16px; font-weight: 700; color: #555; width: 30px; text-align: center; margin-right: 10px;
        }
        
        .list-cover {
            width: 45px; height: 45px; border-radius: 10px; object-fit: cover; margin-right: 15px; border: 1px solid #333;
            display: flex; align-items: center; justify-content: center; background: #222; color: #555; flex-shrink: 0;
            overflow: hidden;
        }
        
        .list-info { flex-grow: 1; display: flex; flex-direction: column; min-width: 0; }
        .list-name { font-weight: 600; font-size: 15px; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .list-desc { font-size: 12px; color: #888; }
        
        /* Action Buttons */
        .action-btn {
            border: none; border-radius: 20px; padding: 6px 16px; font-size: 12px; font-weight: 700;
            cursor: pointer; transition: 0.2s; white-space: nowrap; margin-left: 10px;
        }
        
        .open-btn { background: rgba(0,194,255,0.1); color: #00c2ff; border: 1px solid #00c2ff; }
        .open-btn:hover { background: #00c2ff; color: #000; }

        .join-btn { 
            background: #00c2ff; color: #000; 
            box-shadow: 0 4px 10px rgba(0, 194, 255, 0.2);
        }
        .join-btn:hover { background: #0099cc; transform: translateY(-1px); }

        .empty-state {
            text-align: center; color: #777; margin-top: 50px;
        }
      `}</style>

      <header>
        <button onClick={() => navigate('/groups')} aria-label="Voltar">
            <i className="fa-solid fa-arrow-left"></i>
        </button>
        <h1>Top Grupos</h1>
      </header>

      <main>
        <div className="tabs-container">
            <button 
                className={`tab-btn ${activeTab === 'public' ? 'active' : ''}`} 
                onClick={() => handleTabChange('public')}
            >
                Públicos
            </button>
            <button 
                className={`tab-btn ${activeTab === 'private' ? 'active' : ''}`} 
                onClick={() => handleTabChange('private')}
            >
                Privados
            </button>
            <button 
                className={`tab-btn ${activeTab === 'vip' ? 'active' : ''}`} 
                onClick={() => handleTabChange('vip')}
            >
                VIP
            </button>
        </div>

        {loading ? (
            <div className="text-center text-gray-500 mt-10">
                <i className="fa-solid fa-circle-notch fa-spin text-2xl mb-2 text-[#FFD700]"></i>
                <p>Carregando ranking {activeTab}...</p>
            </div>
        ) : (
            <>
                {rankedGroups.length > 0 && (
                    <div className="top-three-container">
                        {/* 2nd Place */}
                        {rankedGroups.length >= 2 && (
                            <div className="podium-item second-place" onClick={() => handleGroupAction(rankedGroups[1])}>
                                <div className="podium-cover-wrapper">
                                    <i className="fa-solid fa-crown crown-icon"></i>
                                    <div className="podium-cover">
                                        {rankedGroups[1].coverImage ? (
                                            <img src={rankedGroups[1].coverImage} alt="2nd" />
                                        ) : (
                                            <i className={`fa-solid ${rankedGroups[1].isVip ? 'fa-crown' : 'fa-users'}`}></i>
                                        )}
                                    </div>
                                    <div className="rank-badge">2</div>
                                </div>
                                <div className="podium-name">{rankedGroups[1].name}</div>
                                <div className="podium-count">{rankedGroups[1].memberIds?.length || 0} membros</div>
                            </div>
                        )}

                        {/* 1st Place */}
                        {rankedGroups.length >= 1 && (
                            <div className="podium-item first-place" onClick={() => handleGroupAction(rankedGroups[0])}>
                                <div className="podium-cover-wrapper">
                                    <i className="fa-solid fa-crown crown-icon"></i>
                                    <div className="podium-cover">
                                        {rankedGroups[0].coverImage ? (
                                            <img src={rankedGroups[0].coverImage} alt="1st" />
                                        ) : (
                                            <i className={`fa-solid ${rankedGroups[0].isVip ? 'fa-crown' : 'fa-users'}`}></i>
                                        )}
                                    </div>
                                    <div className="rank-badge">1</div>
                                </div>
                                <div className="podium-name">{rankedGroups[0].name}</div>
                                <div className="podium-count">{rankedGroups[0].memberIds?.length || 0} membros</div>
                            </div>
                        )}

                        {/* 3rd Place */}
                        {rankedGroups.length >= 3 && (
                            <div className="podium-item third-place" onClick={() => handleGroupAction(rankedGroups[2])}>
                                <div className="podium-cover-wrapper">
                                    <i className="fa-solid fa-crown crown-icon"></i>
                                    <div className="podium-cover">
                                        {rankedGroups[2].coverImage ? (
                                            <img src={rankedGroups[2].coverImage} alt="3rd" />
                                        ) : (
                                            <i className={`fa-solid ${rankedGroups[2].isVip ? 'fa-crown' : 'fa-users'}`}></i>
                                        )}
                                    </div>
                                    <div className="rank-badge">3</div>
                                </div>
                                <div className="podium-name">{rankedGroups[2].name}</div>
                                <div className="podium-count">{rankedGroups[2].memberIds?.length || 0} membros</div>
                            </div>
                        )}
                    </div>
                )}

                <div className="rank-list">
                    {rankedGroups.length > 0 ? rankedGroups.map((group, index) => {
                        // Oculta os itens do pódio da lista principal para visual mais limpo
                        if (index < 3 && rankedGroups.length >= 1) return null;
                        
                        return (
                            <div key={group.id} className="rank-item" onClick={() => handleGroupAction(group)}>
                                <div className="rank-number">#{index + 1}</div>
                                <div className="list-cover">
                                    {group.coverImage ? (
                                        <img src={group.coverImage} alt="cover" />
                                    ) : (
                                        <i className={`fa-solid ${group.isVip ? 'fa-crown' : 'fa-users'}`}></i>
                                    )}
                                </div>
                                <div className="list-info">
                                    <span className="list-name">{group.name}</span>
                                    <span className="list-desc">{(group.memberIds?.length || 0)} membros</span>
                                </div>
                                <div onClick={(e) => e.stopPropagation()}>
                                    {getActionButton(group)}
                                </div>
                            </div>
                        );
                    }) : !loading && (
                        <div className="empty-state">
                            <i className="fa-solid fa-ghost text-4xl mb-2 opacity-30"></i>
                            <p>Nenhum grupo nesta categoria ainda.</p>
                        </div>
                    )}
                </div>
            </>
        )}
      </main>
    </div>
  );
};
