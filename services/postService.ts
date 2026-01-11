
import { Post, Comment, PaginatedResponse } from '../types';
import { API_BASE } from '../apiConfig';
import { db } from '@/database';
import { authService } from './authService';

const API_URL = `${API_BASE}/api/posts`;

const sanitizePost = (post: any): Post => {
    const currentUserId = authService.getCurrentUserId();
    
    const hasLikedList = Array.isArray(post.likedByIds);
    const likedByIds = hasLikedList ? post.likedByIds : [];
    const viewedByIds = Array.isArray(post.viewedByIds) ? post.viewedByIds : [];

    let isLiked = !!post.liked;
    if (currentUserId && hasLikedList) {
        isLiked = likedByIds.includes(currentUserId);
    }

    return {
        ...post,
        id: String(post.id),
        text: String(post.text || ""),
        authorId: String(post.authorId || post.author_id || ""),
        username: String(post.username || "Anônimo"),
        likes: Number(post.likes || 0),
        comments: Number(post.comments || 0),
        views: Number(post.views || 0),
        liked: isLiked,
        likedByIds: likedByIds,
        viewedByIds: viewedByIds
    };
};

export const postService = {
  formatRelativeTime: (ts: number) => {
      const diff = Math.floor((Date.now() - ts) / 1000);
      if (diff < 60) return 'Agora';
      if (diff < 3600) return `${Math.floor(diff/60)}m`;
      if (diff < 86400) return `${Math.floor(diff/3600)}h`;
      return new Date(ts).toLocaleDateString();
  },

  getFeedPaginated: async (options: any): Promise<PaginatedResponse<Post>> => {
    try {
        const response = await fetch(`${API_URL}?limit=${options.limit}&cursor=${options.cursor || ''}`);
        const data = await response.json();
        const safePosts = (data.data || []).map(sanitizePost);
        db.posts.saveAll(safePosts);
        return { data: safePosts, nextCursor: data.nextCursor };
    } catch (e) {
        return { data: db.posts.getAll().map(sanitizePost), nextCursor: undefined };
    }
  },

  uploadMedia: async (file: File, folder: string = 'feed'): Promise<string> => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);
      const res = await fetch(`${API_BASE}/api/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      return data.files[0].url;
  },

  addPost: async (post: Post) => {
    const currentUserId = authService.getCurrentUserId();
    if (currentUserId) post.authorId = currentUserId;
    await fetch(`${API_URL}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(post)
    });
    db.posts.add(sanitizePost(post));
  },

  toggleLike: async (postId: string) => {
      const userId = authService.getCurrentUserId();
      if (!userId) return;
      
      const post = db.posts.findById(postId);
      if (post) {
          const likedByIds = post.likedByIds || [];
          const isCurrentlyLiked = likedByIds.includes(userId);
          
          if (isCurrentlyLiked) {
              post.likedByIds = likedByIds.filter(id => id !== userId);
              post.likes = Math.max(0, post.likes - 1);
          } else {
              post.likedByIds = [...likedByIds, userId];
              post.likes++;
          }
          
          post.liked = !isCurrentlyLiked;
          db.posts.update(post);
          
          fetch(`${API_URL}/${postId}/interact`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: 'like', userId })
          }).catch(() => {});
          
          return sanitizePost(post);
      }
  },

  incrementView: (id: string) => {
      const userId = authService.getCurrentUserId();
      
      const post = db.posts.findById(id);
      if (post && userId) {
          const viewedByIds = post.viewedByIds || [];
          if (!viewedByIds.includes(userId)) {
              post.viewedByIds = [...viewedByIds, userId];
              post.views++;
              db.posts.update(post); 
          }
      }

      fetch(`${API_URL}/${id}/interact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'view', userId })
      }).catch(() => {});
  },

  getPostById: (id: string) => {
      const post = db.posts.findById(id);
      return post ? sanitizePost(post) : undefined;
  },

  getUserPosts: (authorId: string) => {
      return db.posts.getAll().filter(p => p.authorId === authorId).map(sanitizePost);
  },

  deletePost: async (id: string) => {
      db.posts.delete(id);
      await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
  },

  addComment: async (postId: string, text: string, username: string, avatar?: string) => {
      const userId = authService.getCurrentUserId();
      if (!userId) return;
      const newComment: Comment = { id: Date.now().toString(), userId, text, username, avatar, timestamp: Date.now() };
      
      const post = db.posts.findById(postId);
      if (post) {
          post.commentsList = [newComment, ...(post.commentsList || [])];
          post.comments++;
          db.posts.update(post);
      }

      try {
          await fetch(`${API_URL}/${postId}/comment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ comment: newComment })
          });
      } catch (e) {
          console.warn("Falha ao salvar comentário no servidor", e);
      }

      return newComment;
  },

  deleteComment: async (postId: string, commentId: string) => {
      const post = db.posts.findById(postId);
      if (post) {
          post.commentsList = post.commentsList?.filter(c => c.id !== commentId);
          post.comments--;
          db.posts.update(post);
          return true;
      }
      return false;
  },

  incrementShare: (postId: string, userEmail?: string) => {
      const userId = authService.getCurrentUserId();
      fetch(`${API_URL}/${postId}/interact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'share', userId })
      }).catch(() => {});
  },

  addReply: (postId: string, commentId: string, text: string, username: string, avatar?: string): Comment | undefined => {
      const userId = authService.getCurrentUserId();
      if (!userId) return;
      const newReply: Comment = { id: Date.now().toString(), userId, text, username, avatar, timestamp: Date.now(), likes: 0, likedByMe: false };
      
      const post = db.posts.findById(postId);
      if (post && post.commentsList) {
          const findAndAddReply = (comments: Comment[]): boolean => {
              for (const c of comments) {
                  if (c.id === commentId) {
                      c.replies = [...(c.replies || []), newReply];
                      return true;
                  }
                  if (c.replies && findAndAddReply(c.replies)) return true;
              }
              return false;
          };
          if (findAndAddReply(post.commentsList)) {
              post.comments++;
              db.posts.update(post);
              
              fetch(`${API_URL}/${postId}/reply`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ commentId, reply: newReply })
              }).catch(e => console.warn("Erro ao salvar resposta no servidor", e));

              return newReply;
          }
      }
      return undefined;
  },

  toggleCommentLike: (postId: string, commentId: string): boolean => {
      const post = db.posts.findById(postId);
      if (post && post.commentsList) {
          const updateRecursive = (list: Comment[]): Comment[] => {
              return list.map(c => {
                  if (c.id === commentId) {
                      const newLiked = !c.likedByMe;
                      return { ...c, likedByMe: newLiked, likes: (c.likes || 0) + (newLiked ? 1 : -1) };
                  }
                  if (c.replies) return { ...c, replies: updateRecursive(c.replies) };
                  return c;
              });
          };
          post.commentsList = updateRecursive(post.commentsList);
          db.posts.update(post);
          return true;
      }
      return false;
  }
};
