import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext.js';
import { SocketProvider } from './context/SocketContext.js';
import { DashboardLayout } from './components/layout/DashboardLayout.js';

// Public Pages
import { LandingPage } from './pages/public/LandingPage.js';
import { LoginPage } from './pages/public/LoginPage.js';
import { RegisterOwnerPage } from './pages/public/RegisterOwnerPage.js';
import { AcceptInvitePage } from './pages/public/AcceptInvitePage.js';

// Owner Pages
import { OwnerDashboardPage } from './pages/owner/OwnerDashboardPage.js';
import { PropertiesPage } from './pages/owner/PropertiesPage.js';
import { PropertyDetailPage } from './pages/owner/PropertyDetailPage.js';
import { OwnerMaintenancePage } from './pages/owner/OwnerMaintenancePage.js';
import { OwnerAmenitiesPage } from './pages/owner/OwnerAmenitiesPage.js';
import { OwnerBookingsPage } from './pages/owner/OwnerBookingsPage.js';

// Tenant Pages
import { TenantDashboardPage } from './pages/tenant/TenantDashboardPage.js';
import { MyPropertyPage } from './pages/tenant/MyPropertyPage.js';
import { TenantMaintenancePage } from './pages/tenant/TenantMaintenancePage.js';
import { CreateMaintenancePage } from './pages/tenant/CreateMaintenancePage.js';
import { TenantAmenitiesPage } from './pages/tenant/TenantAmenitiesPage.js';
import { TenantBookingsPage } from './pages/tenant/TenantBookingsPage.js';

// Staff Pages
import { StaffDashboardPage } from './pages/staff/StaffDashboardPage.js';
import { StaffRequestsPage } from './pages/staff/StaffRequestsPage.js';

// Shared Pages
import { MaintenanceDetailPage } from './pages/shared/MaintenanceDetailPage.js';
import { NotificationsPage } from './pages/shared/NotificationsPage.js';
import { ProfilePage } from './pages/shared/ProfilePage.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5000,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register-owner" element={<RegisterOwnerPage />} />
              <Route path="/invite/:token" element={<AcceptInvitePage />} />

              {/* Owner Portal */}
              <Route element={<DashboardLayout allowedRoles={['OWNER']} />}>
                <Route path="/owner/dashboard" element={<OwnerDashboardPage />} />
                <Route path="/owner/properties" element={<PropertiesPage />} />
                <Route path="/owner/properties/:id" element={<PropertyDetailPage />} />
                <Route path="/owner/maintenance" element={<OwnerMaintenancePage />} />
                <Route path="/owner/amenities" element={<OwnerAmenitiesPage />} />
                <Route path="/owner/bookings" element={<OwnerBookingsPage />} />
              </Route>

              {/* Tenant Portal */}
              <Route element={<DashboardLayout allowedRoles={['TENANT']} />}>
                <Route path="/tenant/dashboard" element={<TenantDashboardPage />} />
                <Route path="/tenant/my-property" element={<MyPropertyPage />} />
                <Route path="/tenant/maintenance" element={<TenantMaintenancePage />} />
                <Route path="/tenant/maintenance/new" element={<CreateMaintenancePage />} />
                <Route path="/tenant/amenities" element={<TenantAmenitiesPage />} />
                <Route path="/tenant/bookings" element={<TenantBookingsPage />} />
              </Route>

              {/* Staff Portal */}
              <Route element={<DashboardLayout allowedRoles={['STAFF']} />}>
                <Route path="/staff/dashboard" element={<StaffDashboardPage />} />
                <Route path="/staff/requests" element={<StaffRequestsPage />} />
              </Route>

              {/* Shared Authenticated Routes */}
              <Route element={<DashboardLayout />}>
                <Route path="/maintenance/:id" element={<MaintenanceDetailPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
