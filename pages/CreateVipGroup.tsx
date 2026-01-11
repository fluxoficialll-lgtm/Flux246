
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { groupService } from '../services/groupService';
import { authService } from '../services/authService';
import { postService } from '../services/postService';
import { Group, VipMediaItem } from '../types';
import { PixelSettingsModal } from '../components/groups/PixelSettingsModal';
import { AccessTypeModal } from '../components/groups/AccessTypeModal';
import { CurrencySelectorModal } from '../components/groups/CurrencySelectorModal';
import { ProviderSelectorModal } from '../components/groups/ProviderSelectorModal';
import { ImageCropModal } from '../components/ui/ImageCropModal';

export const CreateVipGroup: React.FC = () => {
  const navigate = useNavigate();
  
  // Form States
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState<string | undefined>(undefined);
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);
  
  // VIP Door States
  const [vipMediaItems, setVipMediaItems] = useState<{file?: File, url: string, type: 'image' | 'video'}[]>([]);
  const [vipDoorText, setVipDoorText] = useState('');
  const [vipButtonText, setVipButtonText] = useState(''); 

  // Price & Access States
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState<'BRL' | 'USD' | 'EUR' | 'BTC' | 'GBP'>('BRL');
  const [accessType, setAccessType] = useState<'lifetime' | 'temporary' | 'one_time'>('lifetime');
  
  // Provider State
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);

  // Recurrence State
  const [billingCycleDays, setBillingCycleDays] = useState<string>('30'); 
  
  // Advanced Marketing
  const [pixelId, setPixelId] = useState('');
  const [pixelToken, setPixelToken] = useState('');
  const [isPixelModalOpen, setIsPixelModalOpen] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
  
  // Crop states
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [rawImage, setRawImage] = useState<string>('');

  const [isCreating, setIsCreating] = useState(false);
  const [hasProvider, setHasProvider] = useState(false);

  useEffect(() => {
      const user = authService.getCurrentUser();
      const connected = !!user?.paymentConfig?.isConnected || !!Object.values(user?.paymentConfigs || {}).some(c => c.isConnected);
      setHasProvider(connected);
      
      // Auto-select primary provider if available
      if (user?.paymentConfig?.isConnected) {
          setSelectedProviderId(user.paymentConfig.providerId);
      } else if (user?.paymentConfigs) {
          const firstConnected = Object.values(user.paymentConfigs).find(c => c.isConnected);
          if (firstConnected) setSelectedProviderId(firstConnected.providerId);
      }
  }, []);

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setRawImage(ev.target?.result as string);
        setIsCropOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCroppedImage = (croppedBase64: string) => {
    setCoverImage(croppedBase64);
    fetch(croppedBase64)
      .then(res => res.blob())
      .then(blob => {
          const file = new File([blob], "group_cover.jpg", { type: "image/jpeg" });
          setSelectedCoverFile(file);
      });
  };

  const handleVipMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const fileArray = Array.from(files) as File[];
    if (vipMediaItems.length + fileArray.length > 10) {
        alert("Máximo de 10 itens na galeria.");
        return;
    }
    const newEntries = fileArray.map(file => ({
        file: file,
        url: URL.createObjectURL(file),
        type: file.type.startsWith('video/') ? 'video' as const : 'image' as const
    }));
    setVipMediaItems(prev => [...prev, ...newEntries]);
  };

  const removeMediaItem = (index: number) => {
      setVipMediaItems(prev => prev.filter((_, i) => i !== index));
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value;
      value = value.replace(/\D/g, "");
      if (value === "") { setPrice(""); return; }
      const numericValue = parseFloat(value) / 100;
      setPrice(numericValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
  };

  const handleSavePixel = (data: { pixelId: string, pixelToken: string }) => {
      setPixelId(data.pixelId);
      setPixelToken(data.pixelToken);
  };

  const getCurrencySymbol = () => {
    switch (currency) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'BTC': return '₿';
      case 'GBP': return '£';
      default: return 'R$';
    }
  };

  const getAccessTypeLabel = () => {
      switch(accessType) {
          case 'lifetime': return 'Vitalício';
          case 'temporary': return 'Periódico';
          case 'one_time': return 'Consumo Único';
          default: return 'Escolher';
      }
  };

  const getProviderLabel = () => {
      if (!selectedProviderId) return 'Escolher';
      if (selectedProviderId === 'syncpay') return 'SyncPay (Pix)';
      if (selectedProviderId === 'stripe') return 'Stripe';
      if (selectedProviderId === 'paypal') return 'PayPal';
      return selectedProviderId.toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating) return;

    if (!selectedProviderId) {
        alert("⚠️ Selecione um provedor de pagamento para continuar.");
        setIsProviderModalOpen(true);
        return;
    }

    const rawPrice = price.replace(/\./g, '').replace(',', '.');
    const numericPrice = parseFloat(rawPrice);
    if (isNaN(numericPrice) || numericPrice < 6.00) {
        alert("⚠️ O preço mínimo para criar um grupo VIP é R$ 6,00.");
        return;
    }

    setIsCreating(true);
    try {
        const currentUserId = authService.getCurrentUserId();
        const currentUserEmail = authService.getCurrentUserEmail();
        let finalCoverUrl = coverImage;
        if (selectedCoverFile) {
            finalCoverUrl = await postService.uploadMedia(selectedCoverFile, 'avatars');
        }
        const uploadedVipMedia: VipMediaItem[] = await Promise.all(
            vipMediaItems.map(async (item) => {
                if (item.file) {
                    const url = await postService.uploadMedia(item.file, 'vips_doors');
                    return { url, type: item.type };
                }
                return { url: item.url, type: item.type };
            })
        );
        const newGroup: Group = {
          id: Date.now().toString(),
          name: groupName,
          description: description,
          coverImage: finalCoverUrl,
          isVip: true,
          price: numericPrice.toString(),
          currency: currency,
          accessType: accessType,
          selectedProviderId: selectedProviderId,
          expirationDate: accessType === 'temporary' ? billingCycleDays : undefined,
          vipDoor: {
            mediaItems: uploadedVipMedia,
            text: vipDoorText || "Bem-vindo ao VIP!",
            buttonText: vipButtonText
          },
          lastMessage: "Grupo criado. Configure os conteúdos.",
          time: "Agora",
          creatorId: currentUserId || '',
          creatorEmail: currentUserEmail || undefined,
          memberIds: currentUserId ? [currentUserId] : [],
          adminIds: currentUserId ? [currentUserId] : [],
          status: 'active',
          pixelId: pixelId || undefined,
          pixelToken: pixelToken || undefined
        };
        await groupService.createGroup(newGroup);
        navigate('/groups');
    } catch (e) {
        alert("Erro ao criar grupo VIP.");
    } finally {
        setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#0c0f14,_#0a0c10)] text-white font-['Inter'] flex flex-col overflow-x-hidden">
      <style>{`
        * { margin:0; padding:0; box-sizing:border-box; font-family:'Inter',sans-serif; }
        header {
            display:flex; align-items:center; justify-content:space-between; padding:16px 32px;
            background: #0c0f14; position:fixed; width:100%; z-index:10; border-bottom:1px solid rgba(255,255,255,0.1);
            top: 0; height: 80px;
        }
        header button { background:none; border:none; color:#00c2ff; font-size:18px; cursor:pointer; transition:0.3s; }
        header button:hover { color:#fff; }
        main { flex-grow:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-start; width:100%; padding-top: 100px; padding-bottom: 100px; }
        #groupCreationForm { width:100%; max-width:500px; padding:0 20px; display: flex; flex-direction: column; gap: 20px; }
        h1 { font-size: 24px; text-align: center; margin-bottom: 20px; background: -webkit-linear-gradient(145deg, #FFD700, #B8860B); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 700; }
        .cover-upload-container { display: flex; flex-direction: column; align-items: center; margin-bottom: 10px; }
        .cover-preview { width: 120px; height: 120px; border-radius: 50%; border: 3px solid #FFD700; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 0 20px rgba(255, 215, 0, 0.2); }
        .cover-preview:hover { border-color: #fff; box-shadow: 0 0 25px rgba(255, 215, 0, 0.4); }
        .cover-preview img { width: 100%; height: 100%; object-fit: cover; }
        .cover-icon { font-size: 40px; color: rgba(255,255,255,0.3); }
        .cover-label { margin-top: 10px; font-size: 14px; color: #FFD700; cursor: pointer; font-weight: 600; }
        .form-group { display: flex; flex-direction: column; }
        .form-group label { font-size: 14px; color: #FFD700; margin-bottom: 8px; font-weight: 600; }
        .form-group input, .form-group textarea { background: #1e2531; border: 1px solid rgba(255, 215, 0, 0.3); border-radius: 8px; color: #fff; padding: 12px; font-size: 16px; transition: border-color 0.3s; }
        .form-group input:focus, .form-group textarea:focus { border-color: #FFD700; outline: none; box-shadow: 0 0 5px rgba(255, 215, 0, 0.5); }
        .form-group textarea { resize: vertical; min-height: 100px; }
        .vip-door-section { border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; margin-top: 10px; }
        .section-title { font-size: 16px; color: #FFD700; font-weight: 700; margin-bottom: 15px; display: flex; align-items: center; gap: 8px; }
        .media-upload-area { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 10px; }
        .media-preview-item { width: 80px; height: 100px; flex-shrink: 0; border-radius: 8px; overflow: hidden; position: relative; border: 1px solid rgba(255, 215, 0, 0.3); background: #000; }
        .media-preview-item img, .media-preview-item video { width: 100%; height: 100%; object-fit: cover; }
        .remove-media-btn { position: absolute; top: 2px; right: 2px; background: rgba(0,0,0,0.7); color: #ff4d4d; border: none; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 12px; }
        .add-media-btn { width: 80px; height: 100px; flex-shrink: 0; border-radius: 8px; border: 1px dashed #FFD700; background: rgba(255, 215, 0, 0.05); display: flex; flex-direction: column; align-items: center; justify-content: center; color: #FFD700; cursor: pointer; gap: 5px; }
        .add-media-btn:hover { background: rgba(255, 215, 0, 0.1); }
        .add-media-btn span { font-size: 10px; font-weight: 600; text-align: center; }
        .common-button { background: #FFD700; border: none; border-radius: 8px; color: #000; padding: 16px 20px; font-size: 18px; font-weight: 700; cursor: pointer; transition: background 0.3s, transform 0.1s; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 8px rgba(255, 215, 0, 0.3); margin-top: 20px; }
        .common-button:hover { background: #e6c200; }
        .common-button:active { transform: scale(0.99); }
        .common-button:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .price-group { display: flex; flex-direction: column; gap: 10px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); }
        .price-group label { font-size: 14px; color: #FFD700; font-weight: 600; }
        .price-input-container { display: flex; align-items: center; background: #1e2531; border: 1px solid rgba(255, 215, 0, 0.3); border-radius: 8px; overflow: hidden; margin-bottom: 5px; }
        .price-input-container span { padding: 12px; background: #28303f; color: #aaa; font-size: 16px; font-weight: 700; min-width: 50px; text-align: center; }
        .price-input-container input { flex-grow: 1; border: none; background: none; padding: 12px; text-align: right; color: #fff; font-weight: 700; }
        
        .selector-trigger {
            width: 100%;
            background: #1e2531;
            border: 1px solid rgba(255, 215, 0, 0.3);
            border-radius: 12px;
            padding: 14px 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            cursor: pointer;
            transition: 0.3s;
            margin-bottom: 5px;
        }
        .selector-trigger:hover {
            border-color: #FFD700;
            background: rgba(255, 215, 0, 0.05);
        }
        .selector-trigger .label { font-size: 13px; color: #888; font-weight: 500; }
        .selector-trigger .value { font-size: 15px; color: #fff; font-weight: 700; display: flex; align-items: center; gap: 10px; }
        .selector-trigger .value i { width: 20px; text-align: center; color: #FFD700; }

        .add-pixel-btn { width: 100%; padding: 14px; background: rgba(255, 255, 255, 0.05); border: 1px dashed #FFD700; border-radius: 12px; color: #FFD700; font-weight: 700; font-size: 14px; cursor: pointer; transition: 0.3s; display: flex; align-items: center; justify-content: center; gap: 10px; }
        .add-pixel-btn:hover { background: rgba(255, 215, 0, 0.1); }
      `}</style>

      <header>
        <button onClick={() => navigate('/create-group')}><i className="fa-solid fa-xmark"></i></button>
        <div className="absolute left-1/2 -translate-x-1/2 w-[60px] h-[60px] bg-white/5 rounded-2xl flex justify-center items-center z-20 cursor-pointer shadow-[0_0_20px_rgba(0,194,255,0.3),inset_0_0_20px_rgba(0,194,255,0.08)]" onClick={() => navigate('/feed')}>
             <div className="absolute w-[40px] h-[22px] rounded-[50%] border-[3px] border-[#00c2ff] rotate-[25deg]"></div>
             <div className="absolute w-[40px] h-[22px] rounded-[50%] border-[3px] border-[#00c2ff] -rotate-[25deg]"></div>
        </div>
      </header>

      <main>
        <form id="groupCreationForm" onSubmit={handleSubmit}>
            <h1>Novo Grupo VIP</h1>
            
            {!hasProvider && (
                <div style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid #eab308', borderRadius: '8px', padding: '12px', marginBottom: '20px', fontSize: '13px', color: '#fef08a' }}>
                    <i className="fa-solid fa-triangle-exclamation" style={{marginRight:'8px'}}></i>
                    Nenhum provedor conectado. <button type="button" onClick={() => navigate('/financial/providers')} style={{textDecoration:'underline', fontWeight:'bold', background:'none', border:'none', color:'inherit', cursor:'pointer'}}>Conectar agora</button>
                </div>
            )}

            <div className="cover-upload-container">
                <label htmlFor="coverImageInput" className="cover-preview">
                    {coverImage ? <img src={coverImage} alt="Cover" /> : <i className="fa-solid fa-crown cover-icon"></i>}
                </label>
                <label htmlFor="coverImageInput" className="cover-label">Capa Principal</label>
                <input type="file" id="coverImageInput" accept="image/*" style={{display: 'none'}} onChange={handleCoverChange} />
            </div>

            <div className="form-group">
                <label htmlFor="groupName">Nome do Grupo</label>
                <input type="text" id="groupName" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Ex: Comunidade Flux Pro" required />
            </div>
            
            <div className="form-group">
                <label htmlFor="groupDescription">Descrição</label>
                <textarea id="groupDescription" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Sobre o que é este grupo?"></textarea>
            </div>

            <div className="vip-door-section">
                <div className="section-title"><i className="fa-solid fa-door-open"></i> Galeria da Porta VIP</div>
                <div className="media-upload-area">
                    {vipMediaItems.map((item, idx) => (
                        <div key={idx} className="media-preview-item">
                            {item.type === 'video' ? <video src={item.url} /> : <img src={item.url} alt={`Preview ${idx}`} />}
                            <button type="button" className="remove-media-btn" onClick={() => removeMediaItem(idx)}><i className="fa-solid fa-xmark"></i></button>
                        </div>
                    ))}
                    <label htmlFor="vipMediaInput" className="add-media-btn">
                        <i className="fa-solid fa-plus"></i>
                        <span>Adicionar</span>
                    </label>
                    <input type="file" id="vipMediaInput" accept="image/*,video/*" multiple style={{display:'none'}} onChange={handleVipMediaChange} />
                </div>

                <div className="form-group">
                    <label htmlFor="vipCopyright">Texto de Venda</label>
                    <textarea id="vipCopyright" value={vipDoorText} onChange={(e) => setVipDoorText(e.target.value)} placeholder="Copy persuasiva..."></textarea>
                </div>

                <div className="form-group">
                    <label htmlFor="vipButtonText">Texto do Botão (Opcional)</label>
                    <input type="text" id="vipButtonText" value={vipButtonText} onChange={(e) => setVipButtonText(e.target.value)} placeholder="Ex: Assinar (Padrão: COMPRAR AGORA)" maxLength={20}/>
                </div>
            </div>
            
            <div className="price-group">
                <label>Venda e Acesso</label>

                {/* Escolher Provedor - First in section */}
                <div className="selector-trigger" onClick={() => setIsProviderModalOpen(true)}>
                    <div className="flex flex-col text-left">
                        <span className="label">Escolher provedor:</span>
                        <span className="value">
                            <i className="fa-solid fa-wallet"></i>
                            {getProviderLabel()}
                        </span>
                    </div>
                    <i className="fa-solid fa-chevron-right text-[#FFD700]"></i>
                </div>
                
                <div className="selector-trigger" onClick={() => setIsAccessModalOpen(true)}>
                    <div className="flex flex-col text-left">
                        <span className="label">Tipo de acesso:</span>
                        <span className="value">
                            <i className={`fa-solid ${accessType === 'lifetime' ? 'fa-infinity' : accessType === 'temporary' ? 'fa-calendar-days' : 'fa-ticket'}`}></i>
                            {getAccessTypeLabel()}
                        </span>
                    </div>
                    <i className="fa-solid fa-chevron-right text-[#FFD700]"></i>
                </div>

                <div className="selector-trigger" onClick={() => setIsCurrencyModalOpen(true)}>
                    <div className="flex flex-col text-left">
                        <span className="label">Moeda para cobrança:</span>
                        <span className="value">
                            <i className={`fa-solid ${currency === 'BRL' ? 'fa-brazil' : currency === 'USD' ? 'fa-dollar-sign' : currency === 'EUR' ? 'fa-euro-sign' : currency === 'BTC' ? 'fa-brands fa-bitcoin' : 'fa-sterling-sign'}`}></i>
                            {currency}
                        </span>
                    </div>
                    <i className="fa-solid fa-chevron-right text-[#FFD700]"></i>
                </div>

                <div className="price-input-container">
                    <span>{getCurrencySymbol()}</span>
                    <input type="text" value={price} onChange={handlePriceChange} placeholder="0,00" required />
                </div>
            </div>

            <div className="vip-door-section">
                <div className="section-title"><i className="fa-solid fa-rocket"></i> Marketing Avançado</div>
                <button type="button" className="add-pixel-btn" onClick={() => setIsPixelModalOpen(true)}>
                    <i className="fa-solid fa-plus-circle"></i>
                    {pixelId ? 'PIXEL CONFIGURADO' : 'ADICIONAR PIXEL'}
                </button>
                {pixelId && <p className="text-[10px] text-[#00ff82] text-center mt-2 font-bold uppercase tracking-widest"><i className="fa-solid fa-check"></i> Meta Pixel Ativo</p>}
            </div>

            <button type="submit" className="common-button" disabled={isCreating}>
                {isCreating ? <i className="fa-solid fa-circle-notch fa-spin"></i> : "Criar Grupo"}
            </button>
        </form>
      </main>

      <ProviderSelectorModal 
        isOpen={isProviderModalOpen}
        onClose={() => setIsProviderModalOpen(false)}
        selectedProviderId={selectedProviderId}
        onSelect={(pid) => setSelectedProviderId(pid)}
      />

      <PixelSettingsModal 
        isOpen={isPixelModalOpen}
        onClose={() => setIsPixelModalOpen(false)}
        initialData={{ pixelId, pixelToken }}
        onSave={handleSavePixel}
      />

      <AccessTypeModal 
        isOpen={isAccessModalOpen}
        onClose={() => setIsAccessModalOpen(false)}
        currentType={accessType}
        onSelect={(type) => setAccessType(type)}
      />

      <CurrencySelectorModal 
        isOpen={isCurrencyModalOpen}
        onClose={() => setIsCurrencyModalOpen(false)}
        currentCurrency={currency}
        onSelect={(curr) => setCurrency(curr)}
      />

      <ImageCropModal 
        isOpen={isCropOpen}
        imageSrc={rawImage}
        onClose={() => setIsCropOpen(false)}
        onSave={handleCroppedImage}
      />
    </div>
  );
};
