
import React from 'react';

interface SimpleUserList {
    name: string;
    username: string;
    avatar?: string;
}

interface FollowListModalProps {
    type: 'followers' | 'following' | null;
    data: SimpleUserList[];
    onClose: () => void;
    onUserClick: (username: string) => void;
}

export const FollowListModal: React.FC<FollowListModalProps> = ({ type, data, onClose, onUserClick }) => {
    if (!type) return null;

    return (
        <div className="follow-modal-overlay fixed inset-0 bg-black/80 z-[100] flex items-center justify-center animate-fade-in" onClick={onClose}>
            <style>{`
                .follow-modal {
                    background: #1a1e26;
                    width: 90%;
                    max-width: 350px;
                    border-radius: 20px;
                    height: 70vh;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    box-shadow: 0 10px 40px rgba(0,0,0,0.6);
                    animation: popIn 0.3s ease;
                }
                .follow-header {
                    padding: 18px 20px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: rgba(255, 255, 255, 0.02);
                }
                .follow-header h3 {
                    font-size: 16px;
                    font-weight: 700;
                    margin: 0;
                    color: #00c2ff;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .close-modal-btn {
                    background: none;
                    border: none;
                    color: #888;
                    font-size: 24px;
                    cursor: pointer;
                    line-height: 1;
                }
                .follow-list {
                    flex-grow: 1;
                    overflow-y: auto;
                    padding: 10px 0;
                }
                .follow-item {
                    display: flex;
                    align-items: center;
                    padding: 12px 20px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
                    cursor: pointer;
                    transition: background 0.2s;
                }
                .follow-item:hover {
                    background: rgba(255, 255, 255, 0.05);
                }
                .f-avatar {
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    object-fit: cover;
                    margin-right: 15px;
                    background: #333;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #555;
                    border: 2px solid rgba(0, 194, 255, 0.2);
                }
                .f-info {
                    display: flex;
                    flex-direction: column;
                }
                .f-name {
                    font-size: 14px;
                    font-weight: 600;
                    color: #fff;
                }
                .f-username {
                    font-size: 12px;
                    color: #888;
                }
                .empty-state {
                    padding: 40px 20px;
                    text-align: center;
                    color: #555;
                    font-size: 14px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 10px;
                }
                .empty-state i {
                    font-size: 40px;
                    opacity: 0.3;
                }
            `}</style>
            <div className="follow-modal" onClick={(e) => e.stopPropagation()}>
                <div className="follow-header">
                    <h3>{type === 'followers' ? 'Seguidores' : 'Seguindo'}</h3>
                    <button className="close-modal-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="follow-list no-scrollbar">
                    {data.length > 0 ? (
                        data.map((u, idx) => (
                            <div key={idx} className="follow-item" onClick={() => onUserClick(u.username)}>
                                {u.avatar ? (
                                    <img src={u.avatar} className="f-avatar" alt={u.name} />
                                ) : (
                                    <div className="f-avatar"><i className="fa-solid fa-user"></i></div>
                                )}
                                <div className="f-info">
                                    <span className="f-name">{u.name}</span>
                                    <span className="f-username">@{u.username}</span>
                                </div>
                                <i className="fa-solid fa-chevron-right ml-auto text-gray-700 text-xs"></i>
                            </div>
                        ))
                    ) : (
                        <div className="empty-state">
                            <i className={`fa-solid ${type === 'followers' ? 'fa-users' : 'fa-user-plus'}`}></i>
                            <p>Nenhum usuário encontrado.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
