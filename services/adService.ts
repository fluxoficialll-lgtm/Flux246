
import { AdCampaign, Post, MarketplaceItem } from '../types';
import { db } from '@/database';
import { authService } from './authService';
import { API_BASE } from '../apiConfig';

const API_URL = `${API_BASE}/api/ads`;

export const adService = {
    /**
     * Creates a new ad campaign and persists it to the database.
     */
    createCampaign: async (campaign: AdCampaign) => {
        const currentUser = authService.getCurrentUser();
        if (!currentUser) throw new Error("Usuário não autenticado");

        const newCampaign: AdCampaign = {
            ...campaign,
            id: Date.now().toString(),
            ownerId: currentUser.id,
            ownerEmail: currentUser.email,
            status: 'active', // In real app, might start as 'pending' or 'active'
            timestamp: Date.now(),
            pricingModel: campaign.pricingModel || 'budget',
            stats: {
                views: 0,
                clicks: 0,
                conversions: 0
            }
        };
        
        // 1. Create on Server
        try {
            await fetch(`${API_URL}/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newCampaign)
            });
        } catch (e) {
            console.error("Failed to create ad on server", e);
        }

        // 2. Save locally (Optimistic)
        db.ads.add(newCampaign);
        return true;
    },

    /**
     * Retrieves all campaigns owned by the current user.
     */
    getMyCampaigns: (): AdCampaign[] => {
        const userEmail = authService.getCurrentUserEmail();
        if (!userEmail) return [];
        
        const allAds = db.ads.getAll();
        return allAds.filter(ad => ad.ownerEmail === userEmail).sort((a, b) => b.timestamp - a.timestamp);
    },

    /**
     * Deletes a campaign (Hard Delete).
     */
    deleteCampaign: async (id: string) => {
        // 1. Delete Locally (Optimistic UI)
        db.ads.delete(id);
        
        // 2. Delete on Server
        try {
            await fetch(`${API_URL}/${id}`, {
                method: 'DELETE'
            });
        } catch (e) {
            console.error("Failed to delete campaign on server:", e);
        }
    },

    /**
     * Retrieves active ads for a specific placement (Feed, Reels, Marketplace).
     * Converts AdCampaign objects into the appropriate display format (Post or MarketplaceItem).
     */
    getAdsForPlacement: (placement: 'feed' | 'reels' | 'marketplace'): (Post | MarketplaceItem)[] => {
        const allAds = db.ads.getAll();
        
        // Filter active ads for the requested placement
        const validAds = allAds.filter(ad => 
            ad.status === 'active' && 
            ad.placements && ad.placements.includes(placement) &&
            (ad.pricingModel === 'commission' || (ad.budget && ad.budget > 0)) 
        );

        // Convert to display format
        return validAds.map(ad => {
            // Safety: Ensure ownerEmail is defined before calling authService
            const user = ad.ownerEmail ? authService.getUserByHandle(ad.ownerEmail) : undefined;
            const fallbackUser = {
                id: ad.ownerId || '',
                email: ad.ownerEmail || 'patrocinado@flux.com',
                profile: { name: 'anunciante', nickname: 'Patrocinado', photoUrl: undefined }
            };

            const finalUser = user || fallbackUser;
            const username = finalUser?.profile?.name ? `@${finalUser.profile.name}` : '@Patrocinado';
            const avatar = finalUser?.profile?.photoUrl;
            
            let ctaLink = '';
            if (ad.destinationType === 'url') ctaLink = ad.targetUrl || '';
            else ctaLink = `/group-landing/${ad.targetGroupId}`;

            if (placement === 'marketplace') {
                const item: MarketplaceItem = {
                    id: `ad_${ad.id}`,
                    title: ad.name || 'Patrocinado',
                    price: 0,
                    category: 'Destaque',
                    location: 'Brasil',
                    description: ad.creative?.text || '',
                    image: ad.creative?.mediaUrl,
                    sellerId: ad.ownerEmail || 'ad_system',
                    sellerName: username,
                    sellerAvatar: avatar,
                    timestamp: Date.now(),
                    isAd: true,
                    adCampaignId: ad.id,
                    ctaText: ad.ctaButton,
                    ctaLink: ctaLink
                };
                return item;
            } else {
                const isVideo = ad.creative?.mediaType === 'video';
                const post: Post = {
                    id: `ad_${ad.id}`,
                    authorId: ad.ownerId || '',
                    type: placement === 'reels' ? 'video' : (isVideo ? 'video' : (ad.creative?.mediaUrl ? 'photo' : 'text')),
                    username: username,
                    avatar: avatar,
                    text: ad.creative?.text || '',
                    image: !isVideo ? ad.creative?.mediaUrl : undefined,
                    video: isVideo ? ad.creative?.mediaUrl : undefined,
                    time: 'Patrocinado',
                    timestamp: Date.now(),
                    isPublic: true,
                    views: ad.stats?.views || 0,
                    likes: 0,
                    comments: 0,
                    liked: false,
                    isAd: true,
                    adCampaignId: ad.id,
                    ctaText: ad.ctaButton,
                    ctaLink: ctaLink,
                    location: 'Patrocinado'
                };
                return post;
            }
        });
    },

    /**
     * Tracks views or clicks for an ad.
     */
    trackMetric: (campaignId: string, type: 'view' | 'click') => {
        const allAds = db.ads.getAll();
        const adIndex = allAds.findIndex(a => a.id === campaignId);
        
        if (adIndex !== -1) {
            const ad = allAds[adIndex];
            if (!ad.stats) ad.stats = { views: 0, clicks: 0, conversions: 0 };
            
            if (type === 'view') ad.stats.views++;
            if (type === 'click') ad.stats.clicks++;
            
            if (ad.pricingModel !== 'commission') {
                const cost = type === 'view' ? 0.01 : 0.20;
                ad.budget = Math.max(0, (ad.budget || 0) - cost);
                
                if (ad.budget <= 0.1) {
                    ad.status = 'ended';
                }
            }

            db.ads.update(ad);
        }
    }
};
