
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Menu, X } from 'lucide-react';

const ResponsiveHeader = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { pastorLogado, isAdminLoggedIn } = useAuth();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  // Se o pastor estiver logado (mas não o admin), não mostrar o header de navegação
  if (pastorLogado && !isAdminLoggedIn) {
    return null;
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <header className="bg-white shadow-mobile-card border-b sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-lg flex items-center justify-center shadow-touch">
              <span className="text-white font-bold text-lg sm:text-xl">🏛️</span>
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-800">IPDA</h1>
              <p className="text-xs sm:text-sm text-gray-600 hidden xs:block">Sistema de Agendamentos</p>
            </div>
          </div>
          
          {/* Menu Desktop */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            <Link
              to="/dashboard"
              className={`px-3 lg:px-4 py-2 rounded-lg font-medium transition-all duration-normal min-h-touch flex items-center ${
                isActive('/dashboard') 
                  ? 'bg-gradient-to-r from-green-400 to-blue-500 text-white shadow-touch-lg transform scale-105'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 hover:shadow-touch'
              }`}
            >
              <span className="text-sm lg:text-base">Dashboard</span>
            </Link>
            <Link
              to="/relatorios"
              className={`px-3 lg:px-4 py-2 rounded-lg font-medium transition-all duration-normal min-h-touch flex items-center ${
                isActive('/relatorios')
                  ? 'bg-gradient-to-r from-green-400 to-blue-500 text-white shadow-touch-lg transform scale-105'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 hover:shadow-touch'
              }`}
            >
              <span className="text-sm lg:text-base">Relatórios</span>
            </Link>
            <Link
              to="/configuracoes"
              className={`px-3 lg:px-4 py-2 rounded-lg font-medium transition-all duration-normal min-h-touch flex items-center ${
                isActive('/configuracoes')
                  ? 'bg-gradient-to-r from-green-400 to-blue-500 text-white shadow-touch-lg transform scale-105'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 hover:shadow-touch'
              }`}
            >
              <span className="text-sm lg:text-base hidden lg:inline">Configurações</span>
              <span className="text-sm lg:text-base lg:hidden">Config</span>
            </Link>
            <Link
              to="/historico"
              className={`px-3 lg:px-4 py-2 rounded-lg font-medium transition-all duration-normal min-h-touch flex items-center ${
                isActive('/historico')
                  ? 'bg-gradient-to-r from-green-400 to-blue-500 text-white shadow-touch-lg transform scale-105'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 hover:shadow-touch'
              }`}
            >
              <span className="text-sm lg:text-base">Histórico</span>
            </Link>
            <Link
              to="/agendamento"
              className={`px-3 lg:px-4 py-2 rounded-lg font-medium transition-all duration-normal min-h-touch flex items-center ${
                isActive('/agendamento')
                  ? 'bg-gradient-to-r from-green-400 to-blue-500 text-white shadow-touch-lg transform scale-105'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 hover:shadow-touch'
              }`}
            >
              <span className="text-sm lg:text-base">Agendamento</span>
            </Link>
            
            <Link
              to="/pastor-login"
              className={`px-3 lg:px-4 py-2 rounded-lg font-medium transition-all duration-normal min-h-touch flex items-center ${
                isActive('/pastor-login')
                  ? 'bg-gradient-to-r from-purple-400 to-pink-500 text-white shadow-touch-lg transform scale-105'
                  : 'text-purple-600 hover:text-purple-800 hover:bg-purple-100 hover:shadow-touch'
              }`}
            >
              <span className="text-sm lg:text-base hidden lg:inline">Login Pastor</span>
              <span className="text-sm lg:text-base lg:hidden">Pastor</span>
            </Link>
          </nav>

          {/* Botão Menu Mobile */}
          <button
            onClick={toggleMobileMenu}
            className="md:hidden p-3 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-all duration-fast min-h-touch min-w-touch flex items-center justify-center touch:bg-gray-50"
            aria-label={isMobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
          >
            <div className={`transition-transform duration-normal ${isMobileMenuOpen ? 'rotate-180' : 'rotate-0'}`}>
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </div>
          </button>
        </div>

        {/* Menu Mobile */}
        {isMobileMenuOpen && (
          <nav className="md:hidden mt-4 pb-4 border-t pt-4 animate-slide-up">
            <div className="flex flex-col space-y-3">
              <Link
                to="/dashboard"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`px-4 py-4 rounded-lg font-medium transition-all duration-normal min-h-touch flex items-center text-base-mobile active:scale-95 ${
                  isActive('/dashboard') 
                    ? 'bg-gradient-to-r from-green-400 to-blue-500 text-white shadow-touch-lg'
                    : 'text-gray-700 active:bg-gray-200 hover:bg-gray-100 hover:shadow-touch'
                }`}
              >
                📊 Dashboard
              </Link>
              <Link
                to="/relatorios"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`px-4 py-4 rounded-lg font-medium transition-all duration-normal min-h-touch flex items-center text-base-mobile active:scale-95 ${
                  isActive('/relatorios')
                    ? 'bg-gradient-to-r from-green-400 to-blue-500 text-white shadow-touch-lg'
                    : 'text-gray-700 active:bg-gray-200 hover:bg-gray-100 hover:shadow-touch'
                }`}
              >
                📈 Relatórios
              </Link>
              <Link
                to="/configuracoes"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`px-4 py-4 rounded-lg font-medium transition-all duration-normal min-h-touch flex items-center text-base-mobile active:scale-95 ${
                  isActive('/configuracoes')
                    ? 'bg-gradient-to-r from-green-400 to-blue-500 text-white shadow-touch-lg'
                    : 'text-gray-700 active:bg-gray-200 hover:bg-gray-100 hover:shadow-touch'
                }`}
              >
                ⚙️ Configurações
              </Link>
              <Link
                to="/historico"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`px-4 py-4 rounded-lg font-medium transition-all duration-normal min-h-touch flex items-center text-base-mobile active:scale-95 ${
                  isActive('/historico')
                    ? 'bg-gradient-to-r from-green-400 to-blue-500 text-white shadow-touch-lg'
                    : 'text-gray-700 active:bg-gray-200 hover:bg-gray-100 hover:shadow-touch'
                }`}
              >
                📚 Histórico
              </Link>
              <Link
                to="/agendamento"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`px-4 py-4 rounded-lg font-medium transition-all duration-normal min-h-touch flex items-center text-base-mobile active:scale-95 ${
                  isActive('/agendamento')
                    ? 'bg-gradient-to-r from-green-400 to-blue-500 text-white shadow-touch-lg'
                    : 'text-gray-700 active:bg-gray-200 hover:bg-gray-100 hover:shadow-touch'
                }`}
              >
                📅 Agendamento
              </Link>
              <Link
                to="/pastor-login"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`px-4 py-4 rounded-lg font-medium transition-all duration-normal min-h-touch flex items-center text-base-mobile active:scale-95 ${
                  isActive('/pastor-login')
                    ? 'bg-gradient-to-r from-purple-400 to-pink-500 text-white shadow-touch-lg'
                    : 'text-purple-600 active:bg-purple-200 hover:bg-purple-100 hover:shadow-touch'
                }`}
              >
                👤 Login Pastor
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default ResponsiveHeader;
