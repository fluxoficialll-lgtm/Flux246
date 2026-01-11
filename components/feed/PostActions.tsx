
import React from 'react';
import { Post } from '../../types';

interface PostActionsProps {
    post: Post;
    onLike: (id: string) => void;
    onCommentClick: (id: string) => void;
    onShare: (post: Post) => void;
}

const formatNumber = (num: number): string => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return num.toString();
};

export const PostActions: React.FC<PostActionsProps> = ({ post, onLike, onCommentClick, onShare }) => {
    return (
        <div className="grid grid-cols-4 px-2 py-3 mt-1 border-t border-white/5 gap-1">
            <button 
                onClick={() => onLike(post.id)}
                className={`flex items-center justify-center gap-2 transition-all ${post.liked ? 'text-red-500 scale-110' : 'text-gray-400 hover:text-[#00c2ff]'}`}
            >
                <i className={`${post.liked ? 'fa-solid' : 'fa-regular'} fa-heart text-xl`}></i>
                <span className="text-xs font-semibold">{formatNumber(post.likes)}</span>
            </button>
            
            <button 
                onClick={() => onCommentClick(post.id)}
                className="flex items-center justify-center gap-2 text-gray-400 hover:text-[#00c2ff] transition-all"
            >
                <i className="fa-regular fa-comment text-xl"></i>
                <span className="text-xs font-semibold">{formatNumber(post.comments)}</span>
            </button>

            <button 
                onClick={() => onShare(post)}
                className="flex items-center justify-center text-gray-400 hover:text-[#00c2ff] transition-all"
            >
                <i className="fa-regular fa-paper-plane text-xl"></i>
            </button>

            <div className="flex items-center justify-center gap-2 text-gray-400 transition-all cursor-default opacity-70">
                <i className="fa-solid fa-eye text-lg"></i>
                <span className="text-xs font-semibold">{formatNumber(post.views)}</span>
            </div>
        </div>
    );
};
