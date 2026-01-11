
import React from 'react';
import { Post } from '../../types';

interface PollPostProps {
    post: Post;
    onVote: (postId: string, index: number) => void;
}

const formatNumber = (num: number): string => {
    if (!num) return '0';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return num.toString();
};

export const PollPost: React.FC<PollPostProps> = ({ post, onVote }) => {
    if (!post.pollOptions) return null;

    const totalVotes = post.pollOptions.reduce((acc, curr) => acc + curr.votes, 0);
    const getPercentage = (votes: number) => {
        if (totalVotes === 0) return 0;
        return Math.round((votes / totalVotes) * 100);
    };

    return (
        <div className="mx-4 mt-2.5 mb-2.5 p-3 bg-[#00c2ff0d] rounded-xl border border-[#00c2ff22]">
            {post.pollOptions.map((option, idx) => {
                const pct = getPercentage(option.votes);
                const isVoted = post.votedOptionIndex === idx;
                return (
                    <div 
                        key={idx}
                        onClick={() => onVote(post.id, idx)}
                        className={`relative mb-2 p-3 rounded-lg cursor-pointer overflow-hidden font-medium transition-colors ${isVoted ? 'bg-[#00c2ff] text-black font-bold' : 'bg-[#1e2531] hover:bg-[#28303f]'}`}
                    >
                        <div 
                            className="absolute top-0 left-0 h-full bg-[#00c2ff] opacity-30 z-0 transition-all duration-500" 
                            style={{ width: `${pct}%` }}
                        ></div>
                        <div className="relative z-10 flex justify-between items-center text-sm">
                            <span>{option.text}</span>
                            <span>{pct}%</span>
                        </div>
                    </div>
                );
            })}
            <div className="text-right text-xs text-gray-500 mt-1">
                {formatNumber(totalVotes)} votos
            </div>
        </div>
    );
};
