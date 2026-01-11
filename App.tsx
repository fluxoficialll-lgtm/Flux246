
import React, { Suspense, lazy, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { authService } from './services/authService';
import { ModalProvider } from './components/ModalSystem';
import { metaPixelService } from './services/metaPixelService';

// Componente de Carregamento Simples
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#0c0f14] text-white">
    <i className="fa-solid fa-circle-notch fa-spin text-3xl text-[#00c2ff]"></i>
  </div>
);

// Lazy load
const Login = lazy(() => import('./pages/Login').then(module => ({ default: module.Login })));
const Register = lazy(() => import('./pages/Register').then(module => ({ default: module.Register })));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail').then(module => ({ default: module.VerifyEmail })));
const CompleteProfile = lazy(() => import('./pages/CompleteProfile').then(module => ({ default: module.CompleteProfile })));
const EditProfile = lazy(() => import('./pages/EditProfile').then(module => ({ default: module.EditProfile })));
const Feed = lazy(() => import('./pages/Feed').then(module => ({ default: module.Feed })));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then(module => ({ default: module.ForgotPassword })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then(module => ({ default: module.ResetPassword })));
const Messages = lazy(() => import('./pages/Messages').then(module => ({ default: module.Messages })));
const Notifications = lazy(() => import('./pages/Notifications').then(module => ({ default: module.Notifications })));
const Profile = lazy(() => import('./pages/Profile').then(module => ({ default: module.Profile })));
const UserProfile = lazy(() => import('./pages/UserProfile').then(module => ({ default: module.UserProfile })));
const Settings = lazy(() => import('./pages/Settings').then(module => ({ default: module.Settings })));
const CreatePost = lazy(() => import('./pages/CreatePost').then(module => ({ default: module.CreatePost })));
const CreatePoll = lazy(() => import('./pages/CreatePoll').then(module => ({ default: module.CreatePoll })));
const CreateReel = lazy(() => import('./pages/CreateReel').then(module => ({ default: module.CreateReel })));
const Reels = lazy(() => import('./pages/Reels').then(module => ({ default: module.Reels })));
const PostDetails = lazy(() => import('./pages/PostDetails').then(module => ({ default: module.PostDetails })));
const Groups = lazy(() => import('./pages/Groups').then(module => ({ default: module.Groups })));
const CreateGroup = lazy(() => import('./pages/CreateGroup').then(module => ({ default: module.CreateGroup })));
const CreateVipGroup = lazy(() => import('./pages/CreateVipGroup').then(module => ({ default: module.CreateVipGroup })));
const CreatePublicGroup = lazy(() => import('./pages/CreatePublicGroup').then(module => ({ default: module.CreatePublicGroup })));
const CreatePrivateGroup = lazy(() => import('./pages/CreatePrivateGroup').then(module => ({ default: module.CreatePrivateGroup })));
const EditGroup = lazy(() => import('./pages/EditGroup').then(module => ({ default: module.EditGroup })));
const VipGroupSales = lazy(() => import('./pages/VipGroupSales').then(module => ({ default: module.VipGroupSales })));
const GroupChat = lazy(() => import('./pages/GroupChat').then(module => ({ default: module.GroupChat })));
const GroupLanding = lazy(() => import('./pages/GroupLanding').then(module => ({ default: module.GroupLanding })));
const GroupSettings = lazy(() => import('./pages/GroupSettings').then(module => ({ default: module.GroupSettings })));
const GroupSettingsPublic = lazy(() => import('./pages/GroupSettingsPublic').then(module => ({ default: module.GroupSettingsPublic })));
const GroupSettingsPrivate = lazy(() => import('./pages/GroupSettingsPrivate').then(module => ({ default: module.GroupSettingsPrivate })));
const GroupSettingsVip = lazy(() => import('./pages/GroupSettingsVip').then(module => ({ default: module.GroupSettingsVip })));
const VipSalesHistory = lazy(() => import('./pages/VipSalesHistory').then(module => ({ default: module.VipSalesHistory })));
const ManageGroupLinks = lazy(() => import('./pages/ManageGroupLinks').then(module => ({ default: module.ManageGroupLinks })));
const GlobalSearch = lazy(() => import('./pages/GlobalSearch').then(module => ({ default: module.GlobalSearch })));
const ReelsSearch = lazy(() => import('./pages/ReelsSearch').then(module => ({ default: module.ReelsSearch })));
const LimitAndControl = lazy(() => import('./pages/LimitAndControl').then(module => ({ default: module.LimitAndControl })));
const Leaderboard = lazy(() => import('./pages/Leaderboard').then(module => ({ default: module.Leaderboard })));

// Páginas de Ranking Separadas
const TopGroupsPublic = lazy(() => import('./pages/TopGroupsPublic').then(module => ({ default: module.TopGroupsPublic })));
const TopGroupsPrivate = lazy(() => import('./pages/TopGroupsPrivate').then(module => ({ default: module.TopGroupsPrivate })));
const TopGroupsVip = lazy(() => import('./pages/TopGroupsVip').then(module => ({ default: module.TopGroupsVip })));

const NotificationSettings = lazy(() => import('./pages/NotificationSettings').then(module => ({ default: module.NotificationSettings })));
const SecurityLogin = lazy(() => import('./pages/SecurityLogin').then(module => ({ default: module.SecurityLogin })));
const TermsAndPrivacy = lazy(() => import('./pages/TermsAndPrivacy').then(module => ({ default: module.TermsAndPrivacy })));
const HelpSupport = lazy(() => import('./pages/HelpSupport').then(module => ({ default: module.HelpSupport })));
const Marketplace = lazy(() => import('./pages/Marketplace').then(module => ({ default: module.Marketplace })));
const CreateMarketplaceItem = lazy(() => import('./pages/CreateMarketplaceItem').then(module => ({ default: module.CreateMarketplaceItem })));
const AdPlacementSelector = lazy(() => import('./pages/AdPlacementSelector').then(module => ({ default: module.AdPlacementSelector })));
const ProductDetails = lazy(() => import('./pages/ProductDetails').then(module => ({ default: module.ProductDetails })));
const MyStore = lazy(() => import('./pages/MyStore').then(module => ({ default: module.MyStore })));
const Chat = lazy(() => import('./pages/Chat').then(module => ({ default: module.Chat })));
const FinancialPanel = lazy(() => import('./pages/FinancialPanel').then(module => ({ default: module.FinancialPanel })));
const ProviderConfig = lazy(() => import('./pages/ProviderConfig').then(module => ({ default: module.ProviderConfig })));
const LocationSelector = lazy(() => import('./pages/LocationSelector').then(module => ({ default: module.LocationSelector })));
const BlockedUsers = lazy(() => import('./pages/BlockedUsers').then(module => ({ default: module.BlockedUsers })));
const Banned = lazy(() => import('./pages/Banned').then(module => ({ default: module.Banned })));

// --- PAGE TRACKER COMPONENT ---
const PageTracker = () => {
    const location = useLocation();
    
    useEffect(() => {
        // @ts-ignore
        const globalPixelId = process.env.VITE_PIXEL_ID || ""; 
        
        if (globalPixelId) {
            metaPixelService.trackPageView(globalPixelId);
        }
    }, [location]);

    return null;
};

// --- PROTECTED ROUTE WITH BAN GUARD ---
const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
    const user = authService.getCurrentUser();
    const location = useLocation();

    if (!user) {
        sessionStorage.setItem('redirect_after_login', location.pathname + location.search);
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    if (user.isBanned) {
        return <Navigate to="/banned" replace />;
    }

    return <>{children}</>;
};

const App: React.FC = () => {
  useEffect(() => {
      const updateOnlineStatus = () => {
          if (authService.getCurrentUserEmail()) {
              authService.updateHeartbeat();
          }
      };
      updateOnlineStatus();
      const interval = setInterval(updateOnlineStatus, 60000);
      return () => clearInterval(interval);
  }, []);

  return (
    <ModalProvider>
        <HashRouter>
        <PageTracker />
        <Suspense fallback={<LoadingSpinner />}>
            <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/banned" element={<Banned />} />
            
            <Route path="/complete-profile" element={<ProtectedRoute><CompleteProfile /></ProtectedRoute>} />
            <Route path="/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
            <Route path="/feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
            <Route path="/reels" element={<ProtectedRoute><Reels /></ProtectedRoute>} />
            <Route path="/reels/:id" element={<ProtectedRoute><Reels /></ProtectedRoute>} />
            <Route path="/reels-search" element={<ProtectedRoute><ReelsSearch /></ProtectedRoute>} />
            <Route path="/create-reel" element={<ProtectedRoute><CreateReel /></ProtectedRoute>} />
            <Route path="/post/:id" element={<ProtectedRoute><PostDetails /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/groups" element={<ProtectedRoute><Groups /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/user/:username" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
            <Route path="/create-post" element={<ProtectedRoute><CreatePost /></ProtectedRoute>} />
            <Route path="/create-poll" element={<ProtectedRoute><CreatePoll /></ProtectedRoute>} />
            <Route path="/create-group" element={<ProtectedRoute><CreateGroup /></ProtectedRoute>} />
            <Route path="/create-group/vip" element={<ProtectedRoute><CreateVipGroup /></ProtectedRoute>} />
            <Route path="/create-group/public" element={<ProtectedRoute><CreatePublicGroup /></ProtectedRoute>} />
            <Route path="/create-group/private" element={<ProtectedRoute><CreatePrivateGroup /></ProtectedRoute>} />
            <Route path="/edit-group/:id" element={<EditGroup />} />
            <Route path="/vip-group-sales/:id" element={<VipGroupSales />} />
            <Route path="/group-chat/:id" element={<ProtectedRoute><GroupChat /></ProtectedRoute>} />
            <Route path="/group-landing/:id" element={<GroupLanding />} />
            <Route path="/group-settings/:id" element={<ProtectedRoute><GroupSettings /></ProtectedRoute>} />
            <Route path="/group-settings-public/:id" element={<GroupSettingsPublic />} />
            <Route path="/group-settings-private/:id" element={<GroupSettingsPrivate />} />
            <Route path="/group-settings-vip/:id" element={<GroupSettingsVip />} />
            <Route path="/vip-sales-history/:id" element={<ProtectedRoute><VipSalesHistory /></ProtectedRoute>} />
            <Route path="/group-links/:id" element={<ProtectedRoute><ManageGroupLinks /></ProtectedRoute>} />
            <Route path="/group-limits/:id" element={<ProtectedRoute><LimitAndControl /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/notification-settings" element={<ProtectedRoute><NotificationSettings /></ProtectedRoute>} />
            <Route path="/security-login" element={<ProtectedRoute><SecurityLogin /></ProtectedRoute>} />
            <Route path="/terms" element={<ProtectedRoute><TermsAndPrivacy /></ProtectedRoute>} />
            <Route path="/help" element={<ProtectedRoute><HelpSupport /></ProtectedRoute>} />
            <Route path="/chat/:id" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
            <Route path="/financial" element={<ProtectedRoute><FinancialPanel /></ProtectedRoute>} />
            <Route path="/financial/providers" element={<ProtectedRoute><ProviderConfig /></ProtectedRoute>} />
            <Route path="/location-filter" element={<ProtectedRoute><LocationSelector /></ProtectedRoute>} />
            <Route path="/blocked-users" element={<ProtectedRoute><BlockedUsers /></ProtectedRoute>} />
            <Route path="/global-search" element={<ProtectedRoute><GlobalSearch /></ProtectedRoute>} />
            <Route path="/rank" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
            
            {/* Rotas de Ranking Totalmente Separadas */}
            <Route path="/top-groups" element={<Navigate to="/top-groups/public" replace />} />
            <Route path="/top-groups/public" element={<ProtectedRoute><TopGroupsPublic /></ProtectedRoute>} />
            <Route path="/top-groups/private" element={<ProtectedRoute><TopGroupsPrivate /></ProtectedRoute>} />
            <Route path="/top-groups/vip" element={<ProtectedRoute><TopGroupsVip /></ProtectedRoute>} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Suspense>
        </HashRouter>
    </ModalProvider>
  );
};

export default App;
