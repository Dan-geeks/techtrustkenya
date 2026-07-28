import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index.tsx";
import Browse from "./pages/Browse.tsx";
import ProductDetail from "./pages/ProductDetail.tsx";
import ShopPage from "./pages/ShopPage.tsx";
import Auth from "./pages/Auth.tsx";
import HowItWorks from "./pages/HowItWorks.tsx";
import Repairs from "./pages/Repairs.tsx";
import NotFound from "./pages/NotFound.tsx";
import VendorRegister from "./pages/vendor/VendorRegister.tsx";
import VendorPending from "./pages/vendor/VendorPending.tsx";
import VendorSuspended from "./pages/vendor/VendorSuspended.tsx";
import VendorRejected from "./pages/vendor/VendorRejected.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import Checkout from "./pages/Checkout.tsx";
import Orders from "./pages/Orders.tsx";
import OrderDetail from "./pages/OrderDetail.tsx";
import Cart from "./pages/Cart.tsx";
import Profile from "./pages/Profile.tsx";
import Notifications from "./pages/Notifications.tsx";
import VendorDashboard from "./pages/vendor/VendorDashboard.tsx";
import AdminDashboard from "./pages/admin/AdminDashboard.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AuthProvider>
          <CartProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/vendor/register" element={<VendorRegister />} />
              <Route path="/vendor/pending" element={<VendorPending />} />
              <Route path="/vendor/suspended" element={<VendorSuspended />} />
              <Route path="/vendor/rejected" element={<VendorRejected />} />
              <Route element={<AppLayout />}>
                <Route path="/" element={<Index />} />
                <Route path="/browse" element={<Browse />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/shop/:vendorId" element={<ShopPage />} />
                <Route path="/repairs" element={<Repairs />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route
                  path="/cart"
                  element={
                    <ProtectedRoute>
                      <Cart />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/orders"
                  element={
                    <ProtectedRoute>
                      <Orders />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/orders/:orderId"
                  element={
                    <ProtectedRoute>
                      <OrderDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/checkout/:orderId"
                  element={
                    <ProtectedRoute>
                      <Checkout />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/notifications"
                  element={
                    <ProtectedRoute>
                      <Notifications />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/vendor/dashboard"
                  element={
                    <ProtectedRoute roles={["vendor"]} requireApprovedVendor>
                      <VendorDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/dashboard"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
