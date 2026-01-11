
import { Capacitor } from '@capacitor/core';

/**
 * Configuração Central da API
 */

const getBaseUrl = () => {
    // Detecção de ambiente nativo (APK Android/iOS)
    const isNative = Capacitor.isNativePlatform();
    
    let envUrl = '';
    try {
        // Alinhado para usar VITE_API_URL conforme solicitado
        // @ts-ignore
        envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "";
    } catch (e) {}

    if (isNative) {
        if (!envUrl || envUrl.includes('localhost')) {
            // No Android Emulator, 10.0.2.2 aponta para o host local
            return 'http://10.0.2.2:3000'; 
        }
        return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
    }

    // Na Web (Render/Navegador)
    // Se estivermos no mesmo domínio (SPA + API), usamos caminhos relativos
    if (!envUrl || window.location.origin.includes(envUrl.replace('https://', '').replace('http://', ''))) {
        return '';
    }
    
    return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
};

export const API_BASE = getBaseUrl();

try {
    console.log(`🚀 [Flux API] Base URL: "${API_BASE || '(Relative Path)'}"`);
} catch (e) {}