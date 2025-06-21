
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePastores } from '../hooks/usePastores';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

// Utilitários de segurança
const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>"'&]/g, '');
};

const validateInput = (nome: string, senha: string): { isValid: boolean; message?: string } => {
  if (!nome.trim() || !senha.trim()) {
    return { isValid: false, message: 'Por favor, preencha todos os campos' };
  }
  
  if (nome.length < 2 || nome.length > 50) {
    return { isValid: false, message: 'Nome deve ter entre 2 e 50 caracteres' };
  }
  
  if (senha.length < 3) {
    return { isValid: false, message: 'Senha deve ter pelo menos 3 caracteres' };
  }
  
  return { isValid: true };
};

const PastorLogin = () => {
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [lastAttempt, setLastAttempt] = useState(0);
  const { pastores } = usePastores();
  const { loginPastor, pastorLogado, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutos

  useEffect(() => {
    if (pastorLogado && isAuthenticated) {
      navigate('/pastor-dashboard');
    }
  }, [pastorLogado, isAuthenticated, navigate]);

  // Verificar se está em lockout
  const isLockedOut = (): boolean => {
    if (attemptCount >= MAX_ATTEMPTS) {
      const timeSinceLastAttempt = Date.now() - lastAttempt;
      if (timeSinceLastAttempt < LOCKOUT_TIME) {
        return true;
      } else {
        // Reset após lockout
        setAttemptCount(0);
        setLastAttempt(0);
        return false;
      }
    }
    return false;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verificar lockout
    if (isLockedOut()) {
      const remainingTime = Math.ceil((LOCKOUT_TIME - (Date.now() - lastAttempt)) / 60000);
      toast.error(`Muitas tentativas. Tente novamente em ${remainingTime} minutos.`);
      return;
    }
    
    // Sanitizar entradas
    const sanitizedNome = sanitizeInput(nome);
    const sanitizedSenha = sanitizeInput(senha);
    
    // Validar entradas
    const validation = validateInput(sanitizedNome, sanitizedSenha);
    if (!validation.isValid) {
      toast.error(validation.message!);
      return;
    }

    setLoading(true);
    
    try {
      // Buscar pastor com dados sanitizados
      const pastor = pastores.find(p => 
        p.nome.toLowerCase() === sanitizedNome.toLowerCase() && 
        p.senha === sanitizedSenha
      );
      
      if (pastor) {
        // Reset contador de tentativas em caso de sucesso
        setAttemptCount(0);
        setLastAttempt(0);
        
        await loginPastor(pastor);
        toast.success('Login realizado com sucesso!');
        navigate('/pastor-dashboard');
      } else {
        // Incrementar contador de tentativas
        const newAttemptCount = attemptCount + 1;
        setAttemptCount(newAttemptCount);
        setLastAttempt(Date.now());
        
        const remainingAttempts = MAX_ATTEMPTS - newAttemptCount;
        if (remainingAttempts > 0) {
          toast.error(`Nome ou senha incorretos. ${remainingAttempts} tentativas restantes.`);
        } else {
          toast.error('Muitas tentativas incorretas. Conta bloqueada por 15 minutos.');
        }
      }
    } catch (error) {
      toast.error('Erro ao fazer login. Tente novamente.');
      console.error('Erro no login:', error);
    } finally {
      setLoading(false);
      // Limpar campos em caso de erro
      if (attemptCount >= MAX_ATTEMPTS - 1) {
        setNome('');
        setSenha('');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 via-blue-50 to-green-50 flex items-center justify-center px-4 sm:px-6 py-6 sm:py-8">
      <div className="bg-white rounded-lg shadow-mobile-card p-6 sm:p-8 w-full max-w-md animate-fade-in">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">🙏 Login do Pastor</h1>
          <p className="text-sm sm:text-base text-gray-600">Acesse seu painel de agendamentos</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5 sm:space-y-6">
          <div>
            <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-2">
              👤 Nome do Pastor
            </label>
            <select
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-4 py-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-normal text-base-mobile sm:text-base min-h-touch shadow-touch"
              required
            >
              <option value="">Selecione seu nome</option>
              {pastores.map((pastor) => (
                <option key={pastor.id} value={pastor.nome}>
                  {pastor.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="senha" className="block text-sm font-medium text-gray-700 mb-2">
              🔒 Senha
            </label>
            <input
              type="password"
              id="senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full px-4 py-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-normal text-base-mobile sm:text-base min-h-touch shadow-touch"
              placeholder="Digite sua senha"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-400 to-blue-500 text-white font-bold py-4 sm:py-3 px-6 rounded-lg shadow-touch-lg hover:from-green-500 hover:to-blue-600 transform hover:scale-105 active:scale-95 transition-all duration-normal disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none min-h-touch text-base-mobile sm:text-base"
          >
            {loading ? '⏳ Entrando...' : '✅ Entrar'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a 
            href="/"
            className="inline-flex items-center justify-center text-blue-600 hover:text-blue-800 text-sm sm:text-base py-2 px-4 rounded-lg hover:bg-blue-50 transition-all duration-normal min-h-touch"
          >
            ← Voltar ao início
          </a>
        </div>
      </div>
    </div>
  );
};

export default PastorLogin;
