
/**
 * Currency Service
 * Gerencia a conversão de moedas e taxas de câmbio para checkout global.
 * Suporta as Top 30 moedas mais usadas no mundo + BTC.
 */

// Taxas de fallback (Base: 1 USD) - Valores aproximados de mercado
const FALLBACK_RATES: Record<string, number> = {
    USD: 1.0,
    EUR: 0.92,
    JPY: 151.60,
    GBP: 0.79,
    CNY: 7.23,
    AUD: 1.52,
    CAD: 1.35,
    CHF: 0.90,
    HKD: 7.82,
    SGD: 1.34,
    KRW: 1345.0,
    INR: 83.30,
    MXN: 16.55,
    BRL: 5.05,
    ZAR: 18.75,
    SEK: 10.65,
    NOK: 10.75,
    NZD: 1.66,
    DKK: 6.88,
    PLN: 3.96,
    THB: 36.50,
    TRY: 32.25,
    IDR: 15900.0,
    MYR: 4.74,
    PHP: 56.20,
    CZK: 23.35,
    HUF: 364.0,
    ILS: 3.68,
    CLP: 948.0,
    COP: 3870.0,
    BTC: 0.000015
};

export interface ConversionResult {
    amount: number;
    currency: string;
    symbol: string;
    formatted: string;
}

export const currencyService = {
    /**
     * Busca a taxa de câmbio atual entre duas moedas via API externa
     */
    getRate: async (from: string, to: string): Promise<number> => {
        if (from === to) return 1;

        try {
            const response = await fetch(`https://open.er-api.com/v6/latest/${from}`);
            const data = await response.json();
            
            if (data && data.rates && data.rates[to]) {
                return data.rates[to];
            }
            throw new Error("Rate not found in API");
        } catch (e) {
            console.warn(`[CurrencyService] Erro ao buscar taxa para ${from}->${to}. Usando fallback de segurança.`);
            const rateFrom = FALLBACK_RATES[from] || 1;
            const rateTo = FALLBACK_RATES[to] || 1;
            
            // Conversão via ponte USD
            return (1 / rateFrom) * rateTo;
        }
    },

    /**
     * Converte um valor e gera o objeto formatado para a UI
     */
    convert: async (amount: number, from: string, to: string): Promise<ConversionResult> => {
        const rate = await currencyService.getRate(from, to);
        const convertedAmount = amount * rate;
        
        const symbol = currencyService.getSymbol(to);
        const formatted = convertedAmount.toLocaleString(currencyService.getLocale(to), {
            style: 'currency',
            currency: to,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        return {
            amount: convertedAmount,
            currency: to,
            symbol,
            formatted
        };
    },

    getSymbol: (currency: string): string => {
        const symbols: Record<string, string> = {
            USD: '$',
            EUR: '€',
            JPY: '¥',
            GBP: '£',
            CNY: '¥',
            AUD: 'A$',
            CAD: 'C$',
            CHF: 'CHF',
            HKD: 'HK$',
            SGD: 'S$',
            KRW: '₩',
            INR: '₹',
            MXN: '$',
            BRL: 'R$',
            ZAR: 'R',
            SEK: 'kr',
            NOK: 'kr',
            NZD: 'NZ$',
            DKK: 'kr',
            PLN: 'zł',
            THB: '฿',
            TRY: '₺',
            IDR: 'Rp',
            MYR: 'RM',
            PHP: '₱',
            CZK: 'Kč',
            HUF: 'Ft',
            ILS: '₪',
            CLP: '$',
            COP: '$',
            BTC: '₿'
        };
        return symbols[currency] || '$';
    },

    getLocale: (currency: string): string => {
        const locales: Record<string, string> = {
            USD: 'en-US',
            EUR: 'de-DE',
            JPY: 'ja-JP',
            GBP: 'en-GB',
            CNY: 'zh-CN',
            AUD: 'en-AU',
            CAD: 'en-CA',
            CHF: 'de-CH',
            HKD: 'zh-HK',
            SGD: 'en-SG',
            KRW: 'ko-KR',
            INR: 'hi-IN',
            MXN: 'es-MX',
            BRL: 'pt-BR',
            ZAR: 'en-ZA',
            SEK: 'sv-SE',
            NOK: 'nb-NO',
            NZD: 'en-NZ',
            DKK: 'da-DK',
            PLN: 'pl-PL',
            THB: 'th-TH',
            TRY: 'tr-TR',
            IDR: 'id-ID',
            MYR: 'ms-MY',
            PHP: 'fil-PH',
            CZK: 'cs-CZ',
            HUF: 'hu-HU',
            ILS: 'he-IL',
            CLP: 'es-CL',
            COP: 'es-CO',
            BTC: 'en-US'
        };
        return locales[currency] || 'en-US';
    }
};
