
import React, { useState, useEffect, useRef, Suspense, lazy, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { groupService } from '../services/groupService';
import { authService } from '../services/authService';
import { metaPixelService } from '../services/metaPixelService';
import { geoService, GeoData } from '../services/geoService';
import { currencyService, ConversionResult } from '../services/currencyService';
import { Group, VipMediaItem } from '../types';
import { API_BASE } from '../apiConfig';

// Carregamento sob demanda dos modais de pagamento
const PaymentFlowModal = lazy(() => import('../components/payments/PaymentFlowModal').then(m => ({ default: m.PaymentFlowModal })));
const EmailCaptureModal = lazy(() => import('../components/payments/EmailCaptureModal').then(m => ({ default: m.EmailCaptureModal })));

export const VipGroupSales: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreator, setIsCreator] = useState(false);
  const [isPurchaseEnabled, setIsPurchaseEnabled] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState<'syncpay' | 'paypal' | 'stripe'>('syncpay');
  
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [hasCapturedEmail, setHasCapturedEmail] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const snapContainerRef = useRef<HTMLDivElement>(null);
  const [zoomedMedia, setZoomedMedia] = useState<{ url: string, type: 'image' | 'video' } | null>(null);
  const [isRenewal, setIsRenewal] = useState(false);

  // --- Estados de Localização e Preço ---
  const [geoData, setGeoData] = useState<GeoData | null>(null);
  const [displayPriceInfo, setDisplayPriceInfo] = useState<ConversionResult | null>(null);

  const hasViewContentFired = useRef(false);
  const pageViewFiredRef = useRef(false);

  const getEmailOrNull = () => authService.getCurrentUserEmail() || localStorage.getItem('guest_email_capture') || undefined;

  const checkAndMarkEvent = (eventName: string, contextId: string): boolean => {
      let stableId = localStorage.getItem('_flux_dedup_id');
      if (!stableId) {
          stableId = Math.random().toString(36).substring(2) + Date.now().toString();
          localStorage.setItem('_flux_dedup_id', stableId);
      }
      const storageKey = `flux_evt_${eventName}_${contextId}_${stableId}`;
      if (localStorage.getItem(storageKey)) return false;
      localStorage.setItem(storageKey, Date.now().toString());
      return true;
  };

  useEffect(() => {
      let emailTimer: any;
      const loadData = async () => {
          if (id) {
              // 1. Detecta Localização (IP)
              const detectedGeo = await geoService.detectCountry();
              setGeoData(detectedGeo);

              // 2. Busca Dados do Grupo
              let foundGroup = await groupService.fetchGroupById(id);
              try {
                  const freshResponse = await fetch(`${API_BASE}/api/groups/${id}`);
                  if (freshResponse.ok) {
                      const data = await freshResponse.json();
                      if (data.group) foundGroup = data.group;
                  }
              } catch (e) {}

              if (foundGroup) {
                  setGroup(foundGroup);
                  
                  // 3. Conversão Automática de Moeda
                  const baseCurrency = foundGroup.currency || 'BRL';
                  const basePrice = parseFloat(foundGroup.price || '0');
                  const targetCurrency = detectedGeo.currency || 'BRL';

                  const conversion = await currencyService.convert(basePrice, baseCurrency, targetCurrency);
                  setDisplayPriceInfo(conversion);

                  const currentUserEmail = authService.getCurrentUserEmail();
                  const guestEmail = localStorage.getItem('guest_email_capture');
                  const emailAvailable = !!currentUserEmail || !!guestEmail;
                  setHasCapturedEmail(emailAvailable);

                  if (!emailAvailable) {
                      emailTimer = setTimeout(() => {
                          if (!localStorage.getItem('guest_email_capture') && !authService.getCurrentUserEmail()) {
                              setIsEmailModalOpen(true);
                          }
                      }, 2000);
                  }
                  
                  if (currentUserEmail && foundGroup.creatorEmail !== currentUserEmail) {
                      const vipStatus = groupService.checkVipStatus(foundGroup.id, currentUserEmail);
                      if (vipStatus === 'active') {
                          navigate(`/group-chat/${id}`, { replace: true });
                          return;
                      }
                      if (vipStatus === 'expired' || vipStatus === 'grace_period') setIsRenewal(true);
                  }

                  if (currentUserEmail && foundGroup.creatorEmail === currentUserEmail) setIsCreator(true);
                  
                  const isInitiallyActive = foundGroup.status === 'active';
                  setIsPurchaseEnabled(isInitiallyActive);

                  if (foundGroup.creatorEmail) {
                      const allUsers = authService.getAllUsers();
                      const creator = allUsers.find(u => u.email === foundGroup.creatorEmail);
                      
                      if (creator) {
                          if (creator.paymentConfigs?.stripe?.isConnected) setPaymentProvider('stripe');
                          else if (creator.paymentConfigs?.paypal?.isConnected) setPaymentProvider('paypal');
                          else if (creator.paymentConfig?.isConnected) setPaymentProvider(creator.paymentConfig.providerId as any);
                          setIsPurchaseEnabled(!!(creator.paymentConfigs?.stripe?.isConnected || creator.paymentConfigs?.paypal?.isConnected || creator.paymentConfig?.isConnected));
                      } else if (isInitiallyActive) {
                          setPaymentProvider('syncpay');
                          setIsPurchaseEnabled(true);
                      }
                  }
              }
          }
          setLoading(false);
      };
      loadData();
      return () => { if (emailTimer) clearTimeout(emailTimer); };
  }, [id]);

  useEffect(() => {
      if (group?.pixelId && group?.id && !pageViewFiredRef.current) {
          if (checkAndMarkEvent('PageView', group.id)) {
              metaPixelService.trackPageView(group.pixelId);
              pageViewFiredRef.current = true;
              setTimeout(() => triggerViewContent(), 100);
          }
      }
  }, [group]);

  const triggerViewContent = () => {
      if (hasViewContentFired.current || !group?.pixelId) return;
      const currentUserEmail = authService.getCurrentUserEmail();
      if (group.creatorEmail !== currentUserEmail) {
          if (checkAndMarkEvent('ViewContent', group.id)) {
              hasViewContentFired.current = true;
              const userEmail = getEmailOrNull();
              metaPixelService.trackViewContent(group.pixelId, {
                  content_ids: [group.id],
                  content_type: 'product_group',
                  content_name: group.name,
                  value: displayPriceInfo?.amount || parseFloat(group.price || '0'),
                  currency: displayPriceInfo?.currency || group.currency || 'BRL'
              }, userEmail ? { email: userEmail } : undefined);
          } else hasViewContentFired.current = true;
      }
  };

  const handleScroll = () => {
      if (snapContainerRef.current) {
          const scrollLeft = snapContainerRef.current.scrollLeft;
          const width = snapContainerRef.current.offsetWidth;
          const index = Math.round(scrollLeft / width);
          if (index !== currentSlide) {
              setCurrentSlide(index);
              if (!hasCapturedEmail) setIsEmailModalOpen(true);
              else triggerViewContent();
          }
      }
  };

  const handleMediaClick = (item: VipMediaItem) => {
      if (!hasCapturedEmail) { setIsEmailModalOpen(true); return; }
      setZoomedMedia(item);
      triggerViewContent();
  };

  const handlePurchaseClick = () => {
      if (!hasCapturedEmail) { setIsEmailModalOpen(true); return; }
      if (isCreator) return;
      setIsPixModalOpen(true);
  };

  const displayMedia: VipMediaItem[] = useMemo(() => {
      const media: VipMediaItem[] = [];
      if (group) {
          if (group.coverImage) media.push({ url: group.coverImage, type: 'image' });
          if (group.vipDoor?.mediaItems && group.vipDoor.mediaItems.length > 0) media.push(...group.vipDoor.mediaItems);
          else if (group.vipDoor?.media) media.push({ url: group.vipDoor.media, type: group.vipDoor.mediaType || 'image' });
          if (media.length === 0) media.push({ url: 'https://placehold.co/400x500/1e293b/00c2ff?text=VIP', type: 'image' });
      }
      return media;
  }, [group]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#0c0f14] text-white">Carregando...</div>;
  if (!group) return <div className="min-h-screen bg-[#0c0f14] text-white p-5 text-center"><button onClick={() => navigate('/feed')} className="text-[#00c2ff]">Voltar</button></div>;

  const customCta = group.vipDoor?.buttonText || 'COMPRAR AGORA';

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#0c0f14,_#0a0c10)] text-white font-['Inter'] flex flex-col overflow-x-hidden">
        <style>{`
            .carousel-wrapper { position: relative; width: 100%; }
            .snap-container { scroll-snap-type: x mandatory; display: flex; gap: 10px; overflow-x: auto; width: 100%; padding-bottom: 20px; scrollbar-width: none; }
            .snap-container::-webkit-scrollbar { display: none; }
            .snap-item { scroll-snap-align: center; flex-shrink: 0; width: 85vw; max-width: 400px; aspect-ratio: 4/5; position: relative; border-radius: 16px; overflow: hidden; border: 1px solid rgba(0, 194, 255, 0.3); background: #000; cursor: pointer; }
            .snap-container > .snap-item:first-child { margin-left: 7.5vw; }
            .snap-container > .snap-item:last-child { margin-right: 7.5vw; }
            .snap-item img, .snap-item video { width: 100%; height: 100%; object-fit: cover; }
            .zoom-hint { position: absolute; bottom: 10px; right: 10px; background: rgba(0,0,0,0.5); padding: 5px; border-radius: 50%; color: #fff; font-size: 14px; pointer-events: none; }
            .carousel-dots { display: flex; justify-content: center; gap: 6px; margin-top: -15px; margin-bottom: 15px; }
            .dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.3); transition: all 0.3s; }
            .dot.active { background: #00c2ff; width: 18px; border-radius: 4px; }
            .cta-button { background: linear-gradient(90deg, #00c2ff, #00aaff); color: #0c0f14; font-weight: 700; padding: 1rem 0; border-radius: 12px; font-size: 1.5rem; box-shadow: 0 5px 20px rgba(0, 194, 255, 0.5); width: 90%; margin-top: 10px; border: none; cursor: pointer; transition: 0.2s; display: block; margin-left: auto; margin-right: auto; }
            .cta-button:active { transform: scale(0.98); }
            .cta-button.disabled { background: #333; color: #777; cursor: not-allowed; box-shadow: none; }
            .cta-button.renewal { background: linear-gradient(90deg, #FFD700, #FFA500); color: #000; }
            .content-section { padding: 16px; max-width: 450px; margin: 0 auto; }
            .copy-box { background: rgba(0, 194, 255, 0.05); border: 1px solid #00c2ff; border-radius: 12px; padding: 20px; margin-top: 20px; max-height: 400px; overflow-y: auto; overflow-x: hidden; word-wrap: break-word; }
            .location-badge { display: inline-flex; align-items: center; gap: 5px; background: rgba(255,255,255,0.1); padding: 4px 10px; border-radius: 20px; font-size: 10px; color: #aaa; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.05); }
        `}</style>

        <header className="flex items-center justify-between p-[16px_32px] bg-[#0c0f14] fixed w-full z-10 border-b border-white/10" style={{top: isCreator ? '30px' : '0', height: '70px'}}>
            <button onClick={() => navigate('/groups')} className="bg-none border-none text-[#00c2ff] text-lg cursor-pointer"><i className="fa-solid fa-arrow-left"></i></button>
            <div className="absolute left-1/2 -translate-x-1/2 w-[60px] h-[60px] bg-white/5 rounded-2xl flex justify-center items-center z-20 cursor-pointer shadow-[0_0_20px_rgba(0,194,255,0.3),inset_0_0_20px_rgba(0,194,255,0.08)]" onClick={() => navigate('/feed')}>
                 <div className="absolute w-[40px] h-[22px] rounded-[50%] border-[3px] border-[#00c2ff] rotate-[25deg]"></div>
                 <div className="absolute w-[40px] h-[22px] rounded-[50%] border-[3px] border-[#00c2ff] -rotate-[25deg]"></div>
            </div>
            <div style={{width: '24px'}}></div> 
        </header>

        <main style={{paddingTop: isCreator ? '120px' : '90px', paddingBottom: '100px', maxWidth: '600px', margin: '0 auto', width: '100%'}}>
            <div className="text-center mb-6 px-4">
                {geoData && (
                    <div className="location-badge animate-fade-in">
                        <i className="fa-solid fa-earth-americas"></i> 
                        Valores em {geoData.currency} para {geoData.countryName}
                    </div>
                )}
                <h1 className="text-2xl font-bold text-[#00c2ff] mb-1">{group.name}</h1>
                <div className="flex items-center justify-center gap-2 text-xs text-gray-400 uppercase tracking-widest">
                    <i className="fa-solid fa-lock"></i> Área VIP Exclusiva
                </div>
            </div>

            <div className="carousel-wrapper">
                <div className="snap-container" ref={snapContainerRef} onScroll={handleScroll}>
                    {displayMedia.map((item, index) => (
                        <div key={index} className="snap-item" onClick={() => handleMediaClick(item)}>
                            {item.type === 'video' ? <video src={item.url} controls={false} /> : <img src={item.url} alt={`VIP ${index}`} />}
                            <div className="zoom-hint"><i className="fa-solid fa-expand"></i></div>
                        </div>
                    ))}
                </div>
                {displayMedia.length > 1 && (
                    <div className="carousel-dots">
                        {displayMedia.map((_, idx) => <div key={idx} className={`dot ${currentSlide === idx ? 'active' : ''}`}></div>)}
                    </div>
                )}
            </div>
            
            <section className="content-section">
                <div className="copy-box text-left space-y-4">
                    <p className="text-base text-gray-200 whitespace-pre-wrap leading-relaxed break-words">{group.vipDoor?.text || "Este grupo contém conteúdo exclusivo. Garanta seu acesso agora!"}</p>
                </div>
            </section>

            <section className="content-section text-center pb-10"> 
                {isCreator ? (
                    <button className="cta-button" onClick={() => navigate(`/group-chat/${group.id}`)}>Gerenciar Grupo (Admin)</button>
                ) : (
                    <button className={`cta-button ${!isPurchaseEnabled ? 'disabled' : ''} ${isRenewal ? 'renewal' : ''}`} onClick={!isPurchaseEnabled ? undefined : handlePurchaseClick} disabled={!isPurchaseEnabled}>
                        {!isPurchaseEnabled ? 'COMPRA INDISPONÍVEL' : (isRenewal ? 'RENOVAR ASSINATURA' : `${customCta} - ${displayPriceInfo?.formatted || '...'}`)}
                    </button>
                )}
                <p className="text-xs text-gray-500 mt-3"><i className="fa-solid fa-shield-halved"></i> Pagamento processado com segurança</p>
            </section>
        </main>

        <Suspense fallback={null}>
            {isEmailModalOpen && (
                <EmailCaptureModal 
                    isOpen={isEmailModalOpen} 
                    onClose={() => setIsEmailModalOpen(false)}
                    onSuccess={(email) => {
                        setHasCapturedEmail(true);
                        setIsEmailModalOpen(false);
                    }}
                    pixelId={group.pixelId}
                    groupId={group.id}
                />
            )}
            
            {isPixModalOpen && (
                <PaymentFlowModal 
                    isOpen={isPixModalOpen}
                    onClose={() => setIsPixModalOpen(false)}
                    group={group}
                    provider={paymentProvider}
                    convertedPriceInfo={displayPriceInfo}
                />
            )}
        </Suspense>
        
        {zoomedMedia && (
            <div className="fixed inset-0 z-[110] bg-black/95 flex items-center justify-center p-2" onClick={() => setZoomedMedia(null)}>
                <button className="absolute top-4 right-4 text-white text-4xl bg-black/50 rounded-full w-10 h-10 flex items-center justify-center z-50">&times;</button>
                {zoomedMedia.type === 'video' ? <video src={zoomedMedia.url} controls autoPlay className="max-w-full max-h-full object-contain" /> : <img src={zoomedMedia.url} alt="Zoom" className="max-w-full max-h-full object-contain rounded-lg" />}
            </div>
        )}
    </div>
  );
};
