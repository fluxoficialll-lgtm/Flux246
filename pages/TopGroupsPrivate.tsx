
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { groupService } from '../services/groupService';
import { authService } from '../services/authService';
import { db } from '@/database';
import { Group } from '../types';

export const TopGroupsPrivate: React.FC = () => {
  const navigate = useNavigate();
  const [rankedGroups, setRankedGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const unsubscribe = db.subscribe('groups', () => loadData(true));
    return () => unsubscribe();
  }, []);

  const loadData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
        const filtered = await groupService.getAllGroupsForRanking('private');
        setRankedGroups(filtered);
    } catch (e) {
        console.error("Erro ao carregar ranking privado", e);
    } finally {
        setLoading(false);
    }
  };

  const handleGroupAction = (group: Group) => {
      const currentUserId = authService.getCurrentUserId();
      if (!currentUserId) return;
      const isMember = group.memberIds?.includes(currentUserId);
      if (isMember) navigate(`/group-chat/${group.id}`);
      else navigate(`/group-landing/${group.id}`);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#0c0f14,_#0a0c10)] text-white font-['Inter'] flex flex-col overflow-x-hidden">
      <style>{`
        header { display:flex; align-items:center; padding:16px; background: #0c0f14; position:fixed; width:100%; z-index:10; border-bottom:1px solid rgba(255,255,255,0.1); top: 0; height: 65px; }
        header button { background:none; border:none; color:#fff; font-size:22px; cursor:pointer; padding-right: 15px; }
        header h1 { font-size:20px; font-weight:700; color: #ff5722; text-transform: uppercase; letter-spacing: 1px; }
        main { padding-top: 80px; padding-bottom: 40px; width: 100%; max-width: 600px; margin: 0 auto; padding-left: 20px; padding-right: 20px; }
        .tabs-container { display: flex; background: rgba(255,255,255,0.05); border-radius: 12px; padding: 4px; margin-bottom: 30px; border: 1px solid rgba(255,255,255,0.1); }
        .tab-btn { flex: 1; padding: 10px; border: none; background: transparent; color: #aaa; font-size: 13px; font-weight: 600; cursor: pointer; border-radius: 8px; transition: 0.3s; }
        .tab-btn.active { background: #ff5722; color: #fff; box-shadow: 0 2px 10px rgba(255,87,34,0.3); }
        .top-three-container { display: flex; justify-content: center; align-items: flex-end; margin-bottom: 40px; gap: 10px; }
        .podium-item { display: flex; flex-direction: column; align-items: center; cursor: pointer; transition: transform 0.3s; position: relative; width: 33%; }
        .podium-cover { border-radius: 16px; object-fit: cover; background: #333; display: flex; align-items: center; justify-content: center; color: #555; overflow: hidden; width: 80px; height: 80px; border: 2px solid #555; }
        .first-place .podium-cover { width: 100px; height: 100px; border: 4px solid #ff5722; box-shadow: 0 0 25px rgba(255, 87, 34, 0.4); }
        .rank-badge { position: absolute; bottom: -10px; left: 50%; transform: translateX(-50%); width: 24px; height: 24px; border-radius: 50%; color: #fff; font-weight: 800; font-size: 14px; display: flex; align-items: center; justify-content: center; border: 2px solid #0c0f14; background: #555; }
        .first-place .rank-badge { background: #ff5722; }
        .rank-list { display: flex; flex-direction: column; gap: 10px; }
        .rank-item { display: flex; align-items: center; padding: 15px; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); transition: background 0.2s; cursor: pointer; }
        .action-btn { border: none; border-radius: 20px; padding: 6px 16px; font-size: 12px; font-weight: 700; cursor: pointer; background: #ff5722; color: #fff; }
      `}</style>
      <header>
        <button onClick={() => navigate('/groups')}><i className="fa-solid fa-arrow-left"></i></button>
        <h1>Ranking Privado</h1>
      </header>
      <main>
        <div className="tabs-container">
            <button className="tab-btn" onClick={() => navigate('/top-groups/public')}>Públicos</button>
            <button className="tab-btn active">Privados</button>
            <button className="tab-btn" onClick={() => navigate('/top-groups/vip')}>VIP</button>
        </div>
        {loading ? <div className="text-center mt-10"><i className="fa-solid fa-circle-notch fa-spin text-2xl text-[#ff5722]"></i></div> : (
            <>
                <div className="top-three-container">
                    {rankedGroups[1] && <div className="podium-item second-place" onClick={() => handleGroupAction(rankedGroups[1])}>
                        <div className="podium-cover">{rankedGroups[1].coverImage ? <img src={rankedGroups[1].coverImage} /> : <i className="fa-solid fa-lock"></i>}</div>
                        <div className="rank-badge">2</div>
                        <div className="podium-name mt-4 text-xs font-bold text-gray-400">{rankedGroups[1].name}</div>
                    </div>}
                    {rankedGroups[0] && <div className="podium-item first-place" onClick={() => handleGroupAction(rankedGroups[0])}>
                        <i className="fa-solid fa-shield-halved absolute -top-8 text-2xl text-[#ff5722]"></i>
                        <div className="podium-cover">{rankedGroups[0].coverImage ? <img src={rankedGroups[0].coverImage} /> : <i className="fa-solid fa-lock"></i>}</div>
                        <div className="rank-badge">1</div>
                        <div className="podium-name mt-4 text-sm font-bold text-[#ff5722]">{rankedGroups[0].name}</div>
                    </div>}
                    {rankedGroups[2] && <div className="podium-item third-place" onClick={() => handleGroupAction(rankedGroups[2])}>
                        <div className="podium-cover">{rankedGroups[2].coverImage ? <img src={rankedGroups[2].coverImage} /> : <i className="fa-solid fa-lock"></i>}</div>
                        <div className="rank-badge">3</div>
                        <div className="podium-name mt-4 text-xs font-bold text-gray-500">{rankedGroups[2].name}</div>
                    </div>}
                </div>
                <div className="rank-list">
                    {rankedGroups.map((group, index) => index > 2 && (
                        <div key={group.id} className="rank-item" onClick={() => handleGroupAction(group)}>
                            <div className="w-8 font-bold text-gray-500">#{index+1}</div>
                            <div className="flex-grow font-semibold">{group.name}</div>
                            <button className="action-btn">Solicitar</button>
                        </div>
                    ))}
                </div>
            </>
        )}
      </main>
    </div>
  );
};
