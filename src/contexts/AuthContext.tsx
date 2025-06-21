
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Pastor {
  id: string;
  nome: string;
  senha: string;
  created_at: string;
  updated_at: string;
}

interface AuthSession {
  pastor: Pastor;
  token: string;
  expiresAt: number;
}

interface AuthContextType {
  isAdminLoggedIn: boolean;
  pastorLogado: Pastor | null;
  isAuthenticated: boolean;
  loginAdmin: () => void;
  logoutAdmin: () => void;
  loginPastor: (pastor: Pastor) => void;
  logoutPastor: () => void;
  validateSession: () => boolean;
}

// Utilitários de segurança
const generateToken = (): string => {
  return btoa(Math.random().toString(36).substring(2) + Date.now().toString(36));
};

const hashPassword = (password: string): string => {
  // Simulação de hash - em produção usar bcrypt ou similar
  return btoa(password + 'salt_key_2024');
};

const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>"'&]/g, '');
};

const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 horas

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [pastorLogado, setPastorLogado] = useState<Pastor | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Validar sessão
  const validateSession = (): boolean => {
    try {
      const sessionData = localStorage.getItem('authSession');
      if (!sessionData) return false;

      const session: AuthSession = JSON.parse(sessionData);
      const now = Date.now();

      if (now > session.expiresAt) {
        // Sessão expirada
        localStorage.removeItem('authSession');
        localStorage.removeItem('pastorLogado');
        setPastorLogado(null);
        setIsAuthenticated(false);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao validar sessão:', error);
      return false;
    }
  };

  // Verificar autenticação ao inicializar
  useEffect(() => {
    const adminLoggedIn = localStorage.getItem('adminLoggedIn') === 'true';
    setIsAdminLoggedIn(adminLoggedIn);

    // Validar sessão do pastor
    if (validateSession()) {
      const pastorData = localStorage.getItem('pastorLogado');
      if (pastorData) {
        try {
          const pastor = JSON.parse(pastorData);
          setPastorLogado(pastor);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Erro ao recuperar dados do pastor:', error);
          localStorage.removeItem('pastorLogado');
          localStorage.removeItem('authSession');
        }
      }
    }
  }, []);

  // Auto-logout quando a sessão expira
  useEffect(() => {
    if (pastorLogado) {
      const interval = setInterval(() => {
        if (!validateSession()) {
          logoutPastor();
        }
      }, 60000); // Verificar a cada minuto

      return () => clearInterval(interval);
    }
  }, [pastorLogado]);

  const loginAdmin = () => {
    setIsAdminLoggedIn(true);
    localStorage.setItem('adminLoggedIn', 'true');
  };

  const logoutAdmin = () => {
    setIsAdminLoggedIn(false);
    localStorage.removeItem('adminLoggedIn');
  };

  const loginPastor = (pastor: Pastor) => {
    try {
      // Sanitizar dados do pastor
      const sanitizedPastor = {
        ...pastor,
        nome: sanitizeInput(pastor.nome)
      };

      // Gerar token e criar sessão
      const token = generateToken();
      const expiresAt = Date.now() + SESSION_DURATION;
      
      const session: AuthSession = {
        pastor: sanitizedPastor,
        token,
        expiresAt
      };

      // Salvar no localStorage
      localStorage.setItem('authSession', JSON.stringify(session));
      localStorage.setItem('pastorLogado', JSON.stringify(sanitizedPastor));
      
      setPastorLogado(sanitizedPastor);
      setIsAuthenticated(true);
      
      console.log('Pastor logado com sucesso. Sessão expira em:', new Date(expiresAt));
    } catch (error) {
      console.error('Erro ao fazer login do pastor:', error);
      throw new Error('Falha na autenticação');
    }
  };

  const logoutPastor = () => {
    try {
      setPastorLogado(null);
      setIsAuthenticated(false);
      localStorage.removeItem('pastorLogado');
      localStorage.removeItem('authSession');
      console.log('Pastor deslogado com sucesso');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return (
    <AuthContext.Provider value={{
      isAdminLoggedIn,
      pastorLogado,
      isAuthenticated,
      loginAdmin,
      logoutAdmin,
      loginPastor,
      logoutPastor,
      validateSession
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
