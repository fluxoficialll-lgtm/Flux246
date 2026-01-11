
import React from 'react';

interface BalanceCardProps {
    revenue: number;
    displayedRevenue: number;
    walletBalance: number;
    ownSalesValue: number;
    affiliateValue: number;
    selectedFilter: string;
    filters: string[];
    onFilterChange: (filter: string) => void;
    onRefresh: () => void;
    onWithdraw: () => void;
    loading: boolean;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
    selectedFilter,
    displayedRevenue,
    ownSalesValue,
    affiliateValue,
    filters,
    onFilterChange,
    onRefresh,
    onWithdraw,
    loading
}) => {
    return (
        <div className="flux-card bg-white/5 border border-white/10 rounded-[20px] p-6 mb-5 shadow-2xl relative animate-fade-in">
            <button 
                className="refresh-btn absolute top-5 right-5 bg-[#00c2ff]/10 text-[#00c2ff] border-none rounded-full w-8 h-8 flex items-center justify-center cursor-pointer transition-all hover:bg-[#00c2ff]/20" 
                onClick={onRefresh} 
                disabled={loading}
            >
                <i className={`fa-solid fa-rotate-right ${loading ? 'fa-spin' : ''}`}></i>
            </button>

            <div className="balance-label text-[14px] text-white/60 mb-2 uppercase tracking-widest">
                <i className="fa-solid fa-chart-line mr-2"></i> 
                {selectedFilter === 'Disponível' ? 'Saldo Total' : `Faturamento (${selectedFilter})`}
            </div>
            
            <div className="balance-amount text-[42px] font-extrabold text-[#00c2ff] mb-2.5 flex items-baseline gap-1.5 drop-shadow-[0_0_15px_rgba(0,194,255,0.3)]">
                <span className="text-[20px] font-semibold text-white">R$</span> 
                {displayedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            
            <div className="breakdown bg-black/20 rounded-xl p-3 mb-5 flex flex-col gap-2">
                <div className="breakdown-item flex justify-between text-[13px] text-gray-300">
                    <span className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-[#00c2ff]"></div> 
                        Vendas Próprias
                    </span>
                    <span className="font-bold text-white">R$ {ownSalesValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="breakdown-item flex justify-between text-[13px] text-gray-300">
                    <span className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-[#FFD700]"></div> 
                        Comissões Afiliados
                    </span>
                    <span className="font-bold text-white">R$ {affiliateValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
            </div>

            <div className="filter-container flex gap-2 overflow-x-auto pb-3 no-scrollbar mb-2">
                {filters.map(f => (
                    <button 
                        key={f} 
                        className={`filter-chip px-4 py-2 rounded-full border text-[13px] font-bold transition-all whitespace-nowrap cursor-pointer ${selectedFilter === f ? 'bg-[#00c2ff]/15 border-[#00c2ff] text-[#00c2ff]' : 'bg-white/5 border-white/10 text-white/60'}`} 
                        onClick={() => onFilterChange(f)}
                    >
                        {f}
                    </button>
                ))}
            </div>

            <button 
                className="withdraw-btn w-full py-4 bg-[#00ff82] text-[#0c0f14] text-[16px] font-extrabold border-none rounded-xl cursor-pointer transition-all hover:scale-[1.02] flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(0,255,130,0.2)]" 
                onClick={onWithdraw}
            >
                <i className="fa-solid fa-money-bill-transfer"></i> SOLICITAR SAQUE
            </button>
        </div>
    );
};
