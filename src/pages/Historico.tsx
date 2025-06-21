import React, { useState } from 'react';
import Header from '@/components/Header';
import { useHistoricoAgendamentos } from '@/hooks/useHistoricoAgendamentos';
import { usePastores } from '@/hooks/usePastores';
import { Calendar, User, Phone, Clock, FileText, Filter, Trash2, BarChart3, Download } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Historico = () => {
  const { historico, loading, fetchHistorico, deleteFromHistory, getHistoricoStats } = useHistoricoAgendamentos();
  const { pastores } = usePastores();
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    pastor: '',
    status: ''
  });
  const [showStats, setShowStats] = useState(false);

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    fetchHistorico(newFilters);
  };

  const clearFilters = () => {
    const emptyFilters = {
      startDate: '',
      endDate: '',
      pastor: '',
      status: ''
    };
    setFilters(emptyFilters);
    fetchHistorico({ limit: 100 });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'atendido':
        return 'bg-green-100 text-green-800';
      case 'cancelado':
        return 'bg-red-100 text-red-800';
      case 'nao_atendido':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'atendido':
        return 'Atendido';
      case 'cancelado':
        return 'Cancelado';
      case 'nao_atendido':
        return 'Não Atendido';
      default:
        return status;
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Nome',
      'Telefone',
      'Email',
      'Pastor',
      'Data Agendamento',
      'Horário',
      'Status',
      'Data Atendimento',
      'Anotações',
      'Motivo Finalização'
    ];

    const csvContent = [
      headers.join(','),
      ...historico.map(item => [
        `"${item.nome}"`,
        `"${item.telefone}"`,
        `"${item.email || ''}"`,
        `"${item.pastor_selecionado || ''}"`,
        `"${item.data_agendamento || ''}"`,
        `"${item.horario_agendamento || ''}"`,
        `"${getStatusLabel(item.status)}"`,
        `"${item.data_atendimento || ''}"`,
        `"${item.anotacoes_pastor || ''}"`,
        `"${item.motivo_finalizacao || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `historico-agendamentos-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const stats = getHistoricoStats();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Histórico de Agendamentos</h1>
          <p className="text-gray-600">Visualize agendamentos finalizados e relatórios históricos</p>
        </div>

        {/* Estatísticas */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Estatísticas</h2>
            </div>
            <button
              onClick={() => setShowStats(!showStats)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              {showStats ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          
          {showStats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-blue-800">Total</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.atendidos}</div>
                <div className="text-sm text-green-800">Atendidos</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{stats.cancelados}</div>
                <div className="text-sm text-red-800">Cancelados</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{stats.naoAtendidos}</div>
                <div className="text-sm text-orange-800">Não Atendidos</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{stats.percentualAtendimento}%</div>
                <div className="text-sm text-purple-800">Taxa Atendimento</div>
              </div>
            </div>
          )}
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Filtros</h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={clearFilters}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Limpar
              </button>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded-md hover:bg-blue-50"
              >
                <Download className="h-4 w-4" />
                Exportar CSV
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pastor</label>
              <select
                value={filters.pastor}
                onChange={(e) => handleFilterChange('pastor', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos os pastores</option>
                {pastores.map(pastor => (
                  <option key={pastor.id} value={pastor.nome}>{pastor.nome}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos os status</option>
                <option value="atendido">Atendido</option>
                <option value="cancelado">Cancelado</option>
                <option value="nao_atendido">Não Atendido</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista do Histórico */}
        <div className="bg-white rounded-lg shadow-sm">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Carregando histórico...</p>
            </div>
          ) : historico.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhum registro encontrado no histórico</p>
              <p className="text-sm text-gray-500 mt-2">Agendamentos finalizados aparecerão aqui automaticamente</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {historico.map((item) => (
                <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{item.nome}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                          {getStatusLabel(item.status)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <span>{item.telefone}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {item.data_agendamento && format(new Date(item.data_agendamento), 'dd/MM/yyyy', { locale: ptBR })}
                            {item.horario_agendamento && ` às ${item.horario_agendamento}`}
                          </span>
                        </div>
                        
                        {item.pastor_selecionado && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>{item.pastor_selecionado}</span>
                          </div>
                        )}
                      </div>
                      
                      {item.email && (
                        <div className="text-sm text-gray-600 mb-2">
                          <strong>Email:</strong> {item.email}
                        </div>
                      )}
                      
                      {item.anotacoes_pastor && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-md">
                          <p className="text-sm text-blue-800">
                            <strong>Anotações do Pastor:</strong> {item.anotacoes_pastor}
                          </p>
                        </div>
                      )}
                      
                      {item.observacoes && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-md">
                          <p className="text-sm text-gray-700">
                            <strong>Observações:</strong> {item.observacoes}
                          </p>
                        </div>
                      )}
                      
                      <div className="mt-3 text-xs text-gray-500 space-y-1">
                        <div>
                          <span>Movido para histórico em: {format(new Date(item.moved_to_history_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
                        </div>
                        {item.data_atendimento && (
                          <div>
                            <span>Data de atendimento: {format(new Date(item.data_atendimento), 'dd/MM/yyyy', { locale: ptBR })}</span>
                          </div>
                        )}
                        {item.motivo_finalizacao && (
                          <div>
                            <span>Motivo: {item.motivo_finalizacao}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        if (confirm('Tem certeza que deseja remover este registro do histórico? Esta ação não pode ser desfeita.')) {
                          deleteFromHistory(item.id);
                        }
                      }}
                      className="ml-4 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Remover do histórico"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rodapé com informações */}
        {historico.length > 0 && (
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Mostrando {historico.length} registros do histórico</p>
            <p className="mt-1">Agendamentos finalizados são movidos automaticamente para o histórico</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Historico;