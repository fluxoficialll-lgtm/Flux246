
import { Post, Comment } from '../types';
import { db } from '@/database';
import { recommendationService } from './recommendationService';
import { postService } from './postService';
import { chatService } from './chatService';
import { authService } from './authService';
import { adService } from './adService';

export const reelsService = {
  getReels: (userEmail?: string, allowAdultContent: boolean = false): Post[] => {
    const allPosts = db.posts.getAll();
    let videos = allPosts.filter(p => p.type === 'video');

    if (!allowAdultContent) {
        videos = videos.filter(p => !p.isAdultContent);
    }

    if (userEmail) {
        const blockedIds = chatService.getBlockedIdentifiers(userEmail);
        if (blockedIds.size > 0) {
            videos = videos.filter(p => {
                const handle = p.username.replace('@', '');
                return !blockedIds.has(p.username) && !blockedIds.has(handle);
            });
        }
    }

    let sortedVideos: Post[] = [];
    if (userEmail && videos.length > 0) {
        sortedVideos = recommendationService.getRecommendedReels(videos, userEmail);
    } else {
        sortedVideos = videos.sort((a, b) => b.timestamp - a.timestamp);
    }

    const activeAds = adService.getAdsForPlacement('reels') as Post[];
    if (activeAds.length > 0) {
        const injectedReels: Post[] = [];
        sortedVideos.forEach((reel, index) => {
            injectedReels.push(reel);
            if ((index + 1) % 4 === 0) {
                const randomAd = activeAds[Math.floor(Math.random() * activeAds.length)];
                if(!injectedReels.find(p => p.id === randomAd.id)) {
                    injectedReels.push(randomAd);
                }
            }
        });
        return injectedReels;
    }

    return sortedVideos;
  },

  getReelsByAuthor: (authorId: string, allowAdultContent: boolean = false): Post[] => {
    const allPosts = db.posts.getAll();
    // Filtro por authorId garante que mesmo trocando o @ o conteúdo seja encontrado
    let videos = allPosts.filter(p => p.type === 'video' && p.authorId === authorId);

    if (!allowAdultContent) {
        videos = videos.filter(p => !p.isAdultContent);
    }

    return videos.sort((a, b) => b.timestamp - a.timestamp);
  },

  searchReels: (query: string, category: 'relevant' | 'recent' | 'watched' | 'unwatched' | 'liked', userEmail?: string): Post[] => {
      const allPosts = db.posts.getAll();
      let videos = allPosts.filter(p => p.type === 'video');

      const term = query.toLowerCase().trim();
      const currentUserId = authService.getCurrentUserId();

      videos = videos.filter(reel => {
          if (userEmail) {
              const blockedIds = chatService.getBlockedIdentifiers(userEmail);
              const handle = reel.username.replace('@', '');
              if (blockedIds.has(reel.username) || blockedIds.has(handle)) return false;
          }

          if (category === 'watched') {
              if (!currentUserId) return false;
              if (!reel.viewedByIds || !reel.viewedByIds.includes(currentUserId)) return false;
          }
          if (category === 'unwatched') {
              if (currentUserId && reel.viewedByIds && reel.viewedByIds.includes(currentUserId)) return false;
          }
          if (category === 'liked') {
              if (!currentUserId) return false;
              if (!reel.likedByIds || !reel.likedByIds.includes(currentUserId)) return false;
          }

          if (term) {
              const textMatch = reel.text?.toLowerCase().includes(term);
              const titleMatch = reel.title?.toLowerCase().includes(term);
              const userMatch = reel.username?.toLowerCase().includes(term);
              return textMatch || titleMatch || userMatch;
          }

          return true;
      });

      if (category === 'relevant') {
          const scored = videos.map(reel => {
              let score = 0;

              if (term) {
                  const title = reel.title?.toLowerCase() || '';
                  const text = reel.text?.toLowerCase() || '';
                  const user = reel.username?.toLowerCase() || '';

                  if (title === term) score += 200; 
                  else if (title.includes(term)) score += 100; 
                  else if (user.includes(term)) score += 80; 
                  else if (text.includes(term)) score += 40; 
              } else {
                  score += 100;
              }

              const behavioralScore = userEmail ? recommendationService.scorePost(reel, userEmail) : 0;
              const totalScore = (score * 50) + behavioralScore;

              return { reel, totalScore };
          });

          scored.sort((a, b) => b.totalScore - a.totalScore);
          return scored.map(s => s.reel);
      } 
      
      return videos.sort((a, b) => b.timestamp - a.timestamp);
  },

  uploadVideo: async (file: File): Promise<string> => {
      return postService.uploadMedia(file, 'reels');
  },

  addReel: (reel: Post) => {
    const newReel = { ...reel, type: 'video' as const };
    const allPosts = db.posts.getAll();
    const isDuplicate = allPosts.some(existing => {
        if (existing.type === 'video' && existing.video && existing.video === newReel.video) {
            return true;
        }
        return false;
    });

    if (isDuplicate) return;
    postService.addPost(newReel);
  },

  toggleLike: async (reelId: string): Promise<Post | undefined> => {
    return await postService.toggleLike(reelId);
  },

  incrementView: (reelId: string) => {
    postService.incrementView(reelId);
    recommendationService.trackImpression(reelId);
  },

  getReelById: (id: string): Post | undefined => {
    if (id.startsWith('ad_')) {
        return postService.getPostById(id);
    }
    const reels = reelsService.getReels();
    return reels.find(r => r.id === id);
  }
};
