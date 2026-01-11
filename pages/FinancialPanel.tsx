
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { syncPayService } from '../services/syncPayService';
import { trackingService } from '../services/trackingService';
import { AffiliateStats } from '../types';

// Novos componentes modulares
import { BalanceCard } from '../components/financial/BalanceCard';
import { AffiliateCard } from '../components/financial/AffiliateCard';
import { GatewayCard } from '../components/financial/GatewayCard';

export const FinancialPanel: React.FC = () => {
  const navigate = useNavigate();
  
  // States de Dados
  const [selectedFilter, setSelectedFilter] = useState('Disponível');
  const [isConnected, setIsConnected] = useState(false);
  const [revenue, setRevenue] = useState(0); 
  const [walletBalance, setWalletBalance] = useState(0); 
  const [displayedRevenue, setDisplayedRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [affiliateStats, setAffiliateStats] = useState<AffiliateStats | null>(null);

  // States de UI Interna dos Cards
  const [showSellers, setShowSellers] = useState(false);
  const [isCopyingLink, setIsCopyingLink] = useState(false);
  const [ownSalesValue, setOwnSalesValue] = useState(0);
  const [affiliateValue, setAffiliateValue] = useState(0);

  // Marketing Settings State
  const [pixelId, setPixelId] = useState('');
  const [pixelToken, setPixelToken] = useState('');
  const [isSavingMarketing, setIsSavingMarketing] = useState(false);

  // Modais State
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [utmSource, setUtmSource] = useState('facebook');
  const [utmMedium, setUtmMedium] = useState('cpc');
  const [utmCampaign, setUtmCampaign] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');

  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState('CPF');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawSuccessId, setWithdrawSuccessId] = useState('');

  const filters = ['Disponível', 'Hoje', 'Ontem', '7d', '30d', '180d'];

  useEffect(() => {
      loadData();
  }, []);

  const loadData = async () => {
      setLoading(true);
      const user = authService.getCurrentUser();
      if (user) {
          setIsConnected(!!user.paymentConfig?.isConnected);
          
          if (user.marketingConfig) {
              setPixelId(user.marketingConfig.pixelId || '');
              setPixelToken(user.marketingConfig.pixelToken || '');
          } else if (user.profile?.marketingConfig) {
              setPixelId(user.profile.marketingConfig.pixelId || '');
              setPixelToken(user.profile.marketingConfig.pixelToken || '');
          }

          if (user.paymentConfig?.isConnected) {
              try {
                  const balance = await syncPayService.getBalance(user.email);
                  setWalletBalance(balance);

                  const transactions = await syncPayService.getTransactions(user.email);
                  setAllTransactions(transactions);

                  const affStats = await syncPayService.getAffiliateStats(user.email);
                  setAffiliateStats(affStats);
              } catch (e) {
                  console.error("Erro ao carregar dados financeiros", e);
              }
          }
      }
      setLoading(false);
  };

  useEffect(() => {
      calculateRevenue();
  }, [selectedFilter, allTransactions, walletBalance, affiliateStats]);

  // Animação numérica
  useEffect(() => {
      let start = displayedRevenue;
      const end = revenue;
      if (start === end) return;
      const duration = 1000;
      const startTime = performance.now();
      const animate = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const ease = 1 - Math.pow(1 - progress, 4);
          const currentVal = start + (end - start) * ease;
          setDisplayedRevenue(currentVal);
          if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
  }, [revenue]);

  const calculateRevenue = () => {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const oneDay = 24 * 60 * 60 * 1000;

      const getFilterTimestamp = (filter: string) => {
          switch(filter) {
              case 'Hoje': return startOfDay;
              case 'Ontem': return startOfDay - oneDay;
              case '7d': return now.getTime() - (7 * oneDay);
              case '30d': return now.getTime() - (30 * oneDay);
              case '180d': return now.getTime() - (180 * oneDay);
              default: return 0;
          }
      };

      const ts = getFilterTimestamp(selectedFilter);

      const filteredOwn = allTransactions.filter(tx => {
          const status = (tx.status || '').toLowerCase();
          const isPaid = ['paid', 'completed', 'approved', 'settled'].includes(status);
          if (!isPaid) return false;
          const txDate = new Date(tx.created_at || tx.createdAt || 0).getTime();
          if (selectedFilter === 'Ontem') {
              return txDate >= ts && txDate < startOfDay;
          }
          return txDate >= ts;
      });

      const ownTotal = filteredOwn.reduce((acc, tx) => acc + parseFloat(tx.amount || 0), 0);

      const affCommissions = affiliateStats?.recentSales.filter(sale => {
          const sDate = sale.timestamp;
          if (selectedFilter === 'Ontem') {
              return sDate >= ts && sDate < startOfDay;
          }
          return sDate >= ts;
      }).reduce((acc, curr) => acc + curr.commission, 0) || 0;

      if (selectedFilter === 'Disponível') {
          setRevenue(walletBalance);
          setAffiliateValue(affiliateStats?.totalEarned || 0);
          setOwnSalesValue(Math.max(0, walletBalance - (affiliateStats?.totalEarned || 0)));
      } else {
          setRevenue(ownTotal + affCommissions);
          setOwnSalesValue(ownTotal);
          setAffiliateValue(affCommissions);
      }
  };

  // Handlers para os Cards
  const handleSaveMarketing = async (data: { pixelId: string, pixelToken: string }) => {
      const user = authService.getCurrentUser();
      if (!user) return;
      setIsSavingMarketing(true);
      try {
          await authService.completeProfile(user.email, {
              ...user.profile!,
              marketingConfig: { pixelId: data.pixelId, pixelToken: data.pixelToken }
          } as any);
          setPixelId(data.pixelId);
          setPixelToken(data.pixelToken);
      } catch (e) {
          alert("Erro ao salvar.");
      } finally {
          setIsSavingMarketing(false);
      }
  };

  const handleCopyAffiliateLink = () => {
      const email = authService.getCurrentUserEmail();
      if (!email) return;
      const normalizedEmail = email.toLowerCase().trim();
      const link = `${window.location.origin}/?ref=${encodeURIComponent(normalizedEmail)}`;
      navigator.clipboard.writeText(link).then(() => {
          setIsCopyingLink(true);
          setTimeout(() => setIsCopyingLink(false), 2000);
      });
  };

  const handleGenerateTrackingLink = () => {
      const email = authService.getCurrentUserEmail();
      if (!email) return;
      const baseUrl = `${window.location.origin}/`;
      const finalLink = trackingService.generateTrackingLink(baseUrl, {
          ref: email.toLowerCase().trim(),
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign || 'recrutamento'
      });
      setGeneratedLink(finalLink);
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setWithdrawError('');
      const amount = parseFloat(withdrawAmount.replace(/\./g, '').replace(',', '.'));
      if (isNaN(amount) || amount < 5) {
          setWithdrawError("O valor mínimo para saque é R$ 5,00.");
          return;
      }
      if (amount > walletBalance) {
          setWithdrawError("Saldo insuficiente.");
          return;
      }
      if (!pixKey.trim()) {
          setWithdrawError("Informe sua chave PIX.");
          return;
      }
      if (!window.confirm(`Confirmar saque de R$ ${amount.toFixed(2)}?`)) return;

      setIsWithdrawing(true);
      try {
          const user = authService.getCurrentUser();
          if (!user) throw new Error("Usuário não identificado");
          const response = await syncPayService.requestWithdrawal(user, amount, pixKey, pixKeyType);
          setWithdrawSuccessId(response.transactionId || 'wd_success');
          setIsWithdrawing(false);
          setTimeout(() => loadData(), 1500);
      } catch (err: any) {
          setWithdrawError(err.message || "Falha no processamento.");
          setIsWithdrawing(false);
      }
  };

  const handleBack = () => {
      if (window.history.state && window.history.state.idx > 0) navigate(-1);
      else navigate('/settings');
  };

  return (
    <div className="h-screen bg-[radial-gradient(circle_at_top_left,_#0c0f14,_#0a0c10)] text-white font-['Inter'] flex flex-col overflow-y-auto overflow-x-hidden">
      <header className="flex items-center justify-between p-4 bg-[#0c0f14] fixed w-full z-10 border-b border-white/10 top-0 h-[65px]">
        <button onClick={handleBack} aria-label="Voltar"><i className="fa-solid fa-arrow-left"></i></button>
        <h1 className="text-[20px] font-semibold">Painel Financeiro</h1>
        <div style={{width: '24px'}}></div>
      </header>

      <main className="pt-[80px] pb-[40px] w-full max-w-[600px] mx-auto px-5">
        
        {/* CARD 1: SALDO (BALANCÊ) */}
        <BalanceCard 
            revenue={revenue}
            displayedRevenue={displayedRevenue}
            walletBalance={walletBalance}
            ownSalesValue={ownSalesValue}
            affiliateValue={affiliateValue}
            selectedFilter={selectedFilter}
            filters={filters}
            onFilterChange={setSelectedFilter}
            onRefresh={loadData}
            onWithdraw={() => setIsWithdrawModalOpen(true)}
            loading={loading}
        />

        {/* CARD 2: AFILIADOS */}
        {isConnected && (
            <AffiliateCard 
                affiliateStats={affiliateStats}
                pixelId={pixelId}
                setPixelId={setPixelId}
                pixelToken={pixelToken}
                setPixelToken={setPixelToken}
                isSavingMarketing={isSavingMarketing}
                onSaveMarketing={handleSaveMarketing}
                onCopyAffiliateLink={handleCopyAffiliateLink}
                isCopyingLink={isCopyingLink}
                onOpenTracking={() => setIsTrackingModalOpen(true)}
                showSellers={showSellers}
                setShowSellers={setShowSellers}
            />
        )}

        {/* CARD 3: GATEWAY STATUS */}
        <GatewayCard 
            isConnected={isConnected}
            onManage={() => navigate('/financial/providers')}
        />

      </main>

      {/* MODAL: GERADOR UTM */}
      {isTrackingModalOpen && (
          <div className="fixed inset-0 bg-black/85 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setIsTrackingModalOpen(false)}>
              <div className="bg-[#1a1e26] rounded-[24px] p-8 w-full max-w-[400px] border border-white/10 shadow-2xl relative animate-pop-in" onClick={e => e.stopPropagation()}>
                  <button className="absolute top-5 right-5 text-gray-400 text-2xl border-none bg-transparent cursor-pointer" onClick={() => setIsTrackingModalOpen(false)}>&times;</button>
                  <h3 className="text-[18px] font-bold text-center mb-6"><i className="fa-solid fa-link text-[#FFD700] mr-2"></i> Gerar Link de Afiliado</h3>
                  
                  <div className="space-y-4">
                      <div className="flex flex-col gap-1.5">
                          <label className="text-[12px] font-bold text-gray-400 uppercase">Origem (Source)</label>
                          <select className="w-full p-3 bg-black/30 border border-white/10 rounded-xl text-white outline-none" value={utmSource} onChange={e => setUtmSource(e.target.value)}>
                              <option value="facebook">Facebook Ads</option>
                              <option value="instagram">Instagram</option>
                              <option value="tiktok">TikTok</option>
                              <option value="whatsapp">WhatsApp</option>
                          </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                          <label className="text-[12px] font-bold text-gray-400 uppercase">Mídia (Medium)</label>
                          <select className="w-full p-3 bg-black/30 border border-white/10 rounded-xl text-white outline-none" value={utmMedium} onChange={e => setUtmMedium(e.target.value)}>
                              <option value="cpc">CPC (Tráfego Pago)</option>
                              <option value="organic">Orgânico</option>
                              <option value="social">Social</option>
                          </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                          <label className="text-[12px] font-bold text-gray-400 uppercase">Campanha</label>
                          <input type="text" className="w-full p-3 bg-black/30 border border-white/10 rounded-xl text-white outline-none focus:border-[#FFD700]" placeholder="Ex: lancamento_vendedores" value={utmCampaign} onChange={e => setUtmCampaign(e.target.value)} />
                      </div>
                  </div>

                  <button className="w-full py-4 bg-[#FFD700] text-black font-black rounded-xl mt-6 border-none cursor-pointer" onClick={handleGenerateTrackingLink}>GERAR LINK</button>

                  {generatedLink && (
                      <div className="mt-5 animate-fade-in">
                          <div className="bg-black p-3 rounded-lg border border-dashed border-gray-700 text-[11px] font-mono text-[#00ff82] break-all max-h-[80px] overflow-y-auto mb-3">{generatedLink}</div>
                          <button className="w-full py-3 bg-[#00ff82] text-black font-bold rounded-xl border-none cursor-pointer" onClick={() => { navigator.clipboard.writeText(generatedLink); alert("Copiado!"); setIsTrackingModalOpen(false); }}>COPIAR LINK</button>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* MODAL: SAQUE */}
      {isWithdrawModalOpen && (
          <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in" onClick={() => !isWithdrawing && setIsWithdrawModalOpen(false)}>
              <div className="bg-[#1a1e26] rounded-[24px] p-8 w-full max-w-[380px] border border-[#00ff82]/30 shadow-2xl relative animate-pop-in" onClick={e => e.stopPropagation()}>
                  <h3 className="text-[20px] font-bold text-center mb-6">Solicitar Saque</h3>
                  
                  {withdrawSuccessId ? (
                      <div className="text-center py-5">
                          <div className="w-16 h-16 bg-[#00ff82]/10 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-[#00ff82]"><i className="fa-solid fa-check text-2xl text-[#00ff82]"></i></div>
                          <h4 className="text-[#00ff82] text-[18px] mb-2 font-bold">Solicitação Enviada!</h4>
                          <p className="text-gray-400 text-[14px] mb-6">O valor será transferido em breve. ID: {withdrawSuccessId}</p>
                          <button className="w-full py-3 bg-white/10 rounded-xl font-bold" onClick={() => setIsWithdrawModalOpen(false)}>FECHAR</button>
                      </div>
                  ) : (
                      <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                          <div className="flex flex-col gap-1.5">
                              <label className="text-[11px] font-bold text-gray-500 uppercase">Valor do Saque</label>
                              <input type="text" className="w-full p-4 bg-black/20 border border-white/10 rounded-xl text-white text-[18px] font-bold outline-none" placeholder="R$ 0,00" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} />
                          </div>
                          <div className="flex flex-col gap-1.5">
                              <label className="text-[11px] font-bold text-gray-500 uppercase">Chave PIX</label>
                              <input type="text" className="w-full p-4 bg-black/20 border border-white/10 rounded-xl text-white outline-none" placeholder="Informe sua chave" value={pixKey} onChange={e => setPixKey(e.target.value)} />
                          </div>
                          {withdrawError && <p className="text-red-400 text-[12px] text-center">{withdrawError}</p>}
                          <button className="w-full py-4 bg-[#00ff82] text-[#0c0f14] font-black rounded-xl text-[16px] mt-4 shadow-lg shadow-[#00ff82]/20" disabled={isWithdrawing}>
                              {isWithdrawing ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'CONFIRMAR SAQUE'}
                          </button>
                          <button type="button" className="w-full text-gray-500 text-[13px] mt-2 bg-transparent border-none cursor-pointer" onClick={() => setIsWithdrawModalOpen(false)}>Cancelar</button>
                      </form>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};
