import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAgendamentos } from '../hooks/useAgendamentos';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import AgendamentoModal from '../components/AgendamentoModal';

const PastorDashboard = () => {
  const { pastorLogado, logoutPastor } = useAuth();
  const { agendamentos, updateAgendamento, deleteAgendamento, loading } = useAgendamentos();
  const navigate = useNavigate();
  
  const [filtroData, setFiltroData] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [busca, setBusca] = useState('');
  const [selectedAgendamento, setSelectedAgendamento] = useState<any>(null);

  // Filtrar agendamentos do pastor logado
  const agendamentosDoPastor = useMemo(() => {
    if (!pastorLogado) return [];
    
    return agendamentos.filter(agendamento => {
      // Filtrar apenas agendamentos deste pastor
      const isPastorAgendamento = agendamento.pastor_selecionado === pastorLogado.nome;
      if (!isPastorAgendamento) return false;
      
      // Aplicar filtros
      let matches = true;
      
      // Filtro por data
      if (filtroData) {
        matches = matches && agendamento.data_agendamento === filtroData;
      }
      
      // Filtro por status
      if (filtroStatus) {
        matches = matches && agendamento.status === filtroStatus;
      }
      
      // Busca por nome ou telefone
      if (busca) {
        const buscaLower = busca.toLowerCase();
        matches = matches && (
          agendamento.nome?.toLowerCase().includes(buscaLower) ||
          agendamento.telefone?.includes(busca)
        );
      }
      
      return matches;
    });
  }, [agendamentos, pastorLogado, filtroData, filtroStatus, busca]);

  const handleSaveAnotacoes = async (id: string, anotacoes: string) => {
    await updateAgendamento(id, { anotacoes_pastor: anotacoes });
  };

  const handleStatusChange = async (id: string, novoStatus: string) => {
    try {
      await updateAgendamento(id, { status: novoStatus });
      toast.success('Status atualizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleDeleteAgendamento = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este agendamento?')) {
      try {
        await deleteAgendamento(id);
        toast.success('Agendamento excluído com sucesso!');
      } catch (error) {
        toast.error('Erro ao excluir agendamento');
      }
    }
  };

  const handleLogout = () => {
    logoutPastor();
    navigate('/agendamento'); // Redirecionar para agendamento após logout
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmado':
        return 'bg-green-100 text-green-800';
      case 'atendido':
        return 'bg-blue-100 text-blue-800';
      case 'cancelado':
        return 'bg-red-100 text-red-800';
      case 'nao_atendido':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmado':
        return 'Confirmado';
      case 'atendido':
        return 'Atendido';
      case 'cancelado':
        return 'Cancelado';
      case 'nao_atendido':
        return 'Não Atendido';
      default:
        return 'Pendente';
    }
  };

  if (!pastorLogado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-100 via-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Acesso Restrito</h1>
          <p className="text-gray-600 mb-4">Você precisa estar logado como pastor para acessar esta página.</p>
          <button
            onClick={() => navigate('/agendamento')}
            className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 via-blue-50 to-green-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xl">👨‍💼</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Dashboard do Pastor</h1>
                <p className="text-gray-600">Bem-vindo, Pastor {pastorLogado.nome}</p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => navigate('/agendamento')}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Voltar ao Início
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Sair
              </button>
            </div>
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Filtros e Busca</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="filtroData" className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por Data
              </label>
              <input
                type="date"
                id="filtroData"
                value={filtroData}
                onChange={(e) => setFiltroData(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label htmlFor="filtroStatus" className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por Status
              </label>
              <select
                id="filtroStatus"
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Todos os status</option>
                <option value="pendente">Pendente</option>
                <option value="confirmado">Confirmado</option>
                <option value="cancelado">Cancelado</option>
                <option value="atendido">Atendido</option>
                <option value="nao_atendido">Não Atendido</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="busca" className="block text-sm font-medium text-gray-700 mb-2">
                Buscar por Nome ou Telefone
              </label>
              <input
                type="text"
                id="busca"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Digite o nome ou telefone"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
          
          {(filtroData || filtroStatus || busca) && (
            <div className="mt-4">
              <button
                onClick={() => {
                  setFiltroData('');
                  setFiltroStatus('');
                  setBusca('');
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm"
              >
                Limpar Filtros
              </button>
            </div>
          )}
        </div>

        {/* Lista de Agendamentos */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-800">
              Meus Agendamentos ({agendamentosDoPastor.length})
            </h2>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Carregando agendamentos...</p>
            </div>
          ) : agendamentosDoPastor.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">
                {busca || filtroData || filtroStatus 
                  ? 'Nenhum agendamento encontrado com os filtros aplicados.' 
                  : 'Você ainda não possui agendamentos.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {agendamentosDoPastor.map((agendamento) => (
                <div 
                  key={agendamento.id} 
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedAgendamento(agendamento)}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="flex-1">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <h3 className="font-semibold text-gray-800">{agendamento.nome}</h3>
                          <p className="text-sm text-gray-600">{agendamento.telefone}</p>
                          {agendamento.email && (
                            <p className="text-sm text-gray-600">{agendamento.email}</p>
                          )}
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium text-gray-700">
                            {agendamento.data_agendamento && 
                              new Date(agendamento.data_agendamento + 'T00:00:00').toLocaleDateString('pt-BR')
                            }
                          </p>
                          <p className="text-sm text-gray-600">{agendamento.horario_agendamento}</p>
                          <p className="text-sm text-gray-600">{agendamento.tipo_agendamento}</p>
                        </div>
                        
                        <div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(agendamento.status || 'pendente')}`}>
                            {getStatusLabel(agendamento.status || 'pendente')}
                          </span>
                          {agendamento.observacoes && (
                            <p className="text-sm text-gray-600 mt-1">
                              <strong>Assunto:</strong> {agendamento.observacoes}
                            </p>
                          )}
                          {agendamento.anotacoes_pastor && (
                            <p className="text-sm text-blue-600 mt-1">
                              <strong>✓ Com anotações</strong>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mt-4 md:mt-0 md:ml-4" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={agendamento.status || 'pendente'}
                        onChange={(e) => handleStatusChange(agendamento.id, e.target.value)}
                        className="px-3 py-1 border border-gray-300 rounded text-sm bg-white"
                      >
                        <option value="pendente">Pendente</option>
                        <option value="confirmado">Confirmado</option>
                        <option value="cancelado">Cancelado</option>
                        <option value="atendido">Atendido</option>
                        <option value="nao_atendido">Não Atendido</option>
                      </select>
                      
                      <button
                        onClick={() => handleDeleteAgendamento(agendamento.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Agendamento */}
      <AgendamentoModal
        isOpen={!!selectedAgendamento}
        onClose={() => setSelectedAgendamento(null)}
        agendamento={selectedAgendamento}
        onSave={handleSaveAnotacoes}
      />
    </div>
  );
};

export default PastorDashboard;
