
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./hooks/useTheme";
import { ToastProvider } from "./components/Toast";
import { ConnectionStatus } from "./components/ConnectionStatus";
import { SimpleThemeToggle } from "./components/ThemeToggle";
import { analyticsService } from "./services/analyticsService";
import { notificationService } from "./services/notificationService";
import { Suspense, useEffect } from "react";
import { LazyLoader } from "./components/LazyLoader";
import Index from "./pages/Index";
import Configuracoes from "./pages/Configuracoes";
import Agendamento from "./pages/Agendamento";
import Relatorios from "./pages/Relatorios";
import Historico from "./pages/Historico";
import PastorLogin from "./pages/PastorLogin";
import PastorDashboard from "./pages/PastorDashboard";
import GoogleAuthCallback from "./pages/GoogleAuthCallback";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      cacheTime: 10 * 60 * 1000, // 10 minutos
      retry: (failureCount, error: any) => {
        // Não tentar novamente para erros 4xx
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
});

// Inicializar serviços
analyticsService.init({
  environment: import.meta.env.MODE
});

notificationService.init();

// Componente para proteger rotas do pastor
const ProtectedPastorRoute = ({ children }: { children: React.ReactNode }) => {
  const { pastorLogado, isAuthenticated, validateSession } = useAuth();
  
  // Validar sessão antes de permitir acesso
  if (!pastorLogado || !isAuthenticated || !validateSession()) {
    return <Navigate to="/pastor-login" replace />;
  }
  
  return <>{children}</>;
};

// Componente para proteger rotas administrativas
const ProtectedAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdminLoggedIn } = useAuth();
  
  if (!isAdminLoggedIn) {
    return <Navigate to="/agendamento" replace />;
  }
  
  return <>{children}</>;
};

// Componente para redirecionar a rota raiz baseado no estado de login
const RootRedirect = () => {
  const { isAdminLoggedIn } = useAuth();
  
  if (isAdminLoggedIn) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <Navigate to="/agendamento" replace />;
};

// Componente para inicializar analytics
const AnalyticsInitializer = () => {
  useEffect(() => {
    analyticsService.trackPageView('app_start');
  }, []);
  return null;
};

// Componente de layout global
const GlobalLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Barra de status global */}
      <div className="fixed top-0 right-0 z-40 p-4 flex items-center space-x-2">
        <ConnectionStatus />
        <SimpleThemeToggle />
      </div>
      
      {/* Conteúdo principal */}
      <main className="relative">
        {children}
      </main>
      
      {/* Inicializador de analytics */}
      <AnalyticsInitializer />
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider defaultTheme="system">
        <ToastProvider>
          <AuthProvider>
            <Toaster />
            <BrowserRouter>
              <GlobalLayout>
                <Suspense fallback={<LazyLoader />}>
                  <Routes>
                    <Route path="/" element={<RootRedirect />} />
                    <Route 
                      path="/dashboard" 
                      element={
                        <ProtectedAdminRoute>
                          <Index />
                        </ProtectedAdminRoute>
                      } 
                    />
                    <Route 
                      path="/relatorios" 
                      element={
                        <ProtectedAdminRoute>
                          <Relatorios />
                        </ProtectedAdminRoute>
                      } 
                    />
                    <Route 
                      path="/configuracoes" 
                      element={
                        <ProtectedAdminRoute>
                          <Configuracoes />
                        </ProtectedAdminRoute>
                      } 
                    />
                    <Route 
                      path="/historico" 
                      element={
                        <ProtectedAdminRoute>
                          <Historico />
                        </ProtectedAdminRoute>
                      } 
                    />
                    <Route path="/agendamento" element={<Agendamento />} />
                    <Route path="/pastor-login" element={<PastorLogin />} />
                    <Route 
                      path="/pastor-dashboard" 
                      element={
                        <ProtectedPastorRoute>
                          <PastorDashboard />
                        </ProtectedPastorRoute>
                      } 
                    />
                    <Route path="/auth/google/callback" element={<GoogleAuthCallback />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </GlobalLayout>
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
