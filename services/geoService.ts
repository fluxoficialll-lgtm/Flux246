
export interface GeoData {
    countryCode: string;
    countryName: string;
    currency: string;
    ip: string;
}

export const geoService = {
    /**
     * Detecta o país do usuário com base no IP para localização de pagamentos
     */
    detectCountry: async (): Promise<GeoData> => {
        try {
            // Tenta API primária de alta precisão
            const res = await fetch('https://ipwho.is/');
            const data = await res.json();
            
            if (data.success) {
                return {
                    countryCode: data.country_code, // BR, US, DE, JP, IN, GB, CA
                    countryName: data.country,
                    currency: data.currency.code,
                    ip: data.ip
                };
            }
            throw new Error("GeoIP primary failed");
        } catch (e) {
            // Fallback para ipapi.co (Segunda opção)
            try {
                const res = await fetch('https://ipapi.co/json/');
                const data = await res.json();
                return {
                    countryCode: data.country_code,
                    countryName: data.country_name,
                    currency: data.currency,
                    ip: data.ip
                };
            } catch (err) {
                // Default fallback (Brasil) caso as APIs de detecção estejam offline ou bloqueadas por AdBlock
                return {
                    countryCode: 'BR',
                    countryName: 'Brazil',
                    currency: 'BRL',
                    ip: '0.0.0.0'
                };
            }
        }
    }
};
