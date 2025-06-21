
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import StatsCard from '../components/StatsCard';
import CardDetailModal from '../components/CardDetailModal';
import AgendamentoDetailModal from '../components/AgendamentoDetailModal';
import DashboardFilter from '../components/DashboardFilter';
import { useAgendamentos } from '../hooks/useAgendamentos';
import { format, isToday, isThisWeek, isThisMonth, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Eye, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const Index = () => {
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [selectedAgendamento, setSelectedAgendamento] = useState<any>(null);
  const [selectedStatus, setSelectedStatus] = useState('todos');
  const { agendamentos, loading, updateAgendamento, deleteAgendamento } = useAgendamentos();

  // Função para atualizar status dos agendamentos vencidos
  const updateExpiredAgendamentos = async () => {
    const today = startOfDay(new Date());
    
    for (const agendamento of agendamentos) {
      // Usar data_agendamento em vez de created_at para verificar se venceu
      if (agendamento.data_agendamento) {
        const agendamentoDate = startOfDay(new Date(agendamento.data_agendamento));
        
        if (isBefore(agendamentoDate, today)) {
          let newStatus = '';
          
          if (agendamento.status === 'confirmado') {
            newStatus = 'atendido';
          } else if (agendamento.status === 'pendente') {
            newStatus = 'nao_atendido';
          }
          
          if (newStatus && newStatus !== agendamento.status) {
            try {
              await updateAgendamento(agendamento.id, { status: newStatus });
              console.log(`Agendamento ${agendamento.id} atualizado de ${agendamento.status} para ${newStatus}`);
            } catch (error) {
              console.error('Erro ao atualizar status do agendamento:', error);
            }
          }
        }
      }
    }
  };

  useEffect(() => {
    if (!loading && agendamentos.length > 0) {
      updateExpiredAgendamentos();
    }
  }, [loading, agendamentos]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-100 via-blue-50 to-green-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-xl text-gray-600">Carregando dashboard...</div>
          </div>
        </main>
      </div>
    );
  }

  // Calcular estatísticas baseadas nos agendamentos reais
  const agendamentosHoje = agendamentos.filter(a => 
    a.created_at && isToday(new Date(a.created_at))
  );
  
  const agendamentosSemana = agendamentos.filter(a => 
    a.created_at && isThisWeek(new Date(a.created_at))
  );
  
  const agendamentosMes = agendamentos.filter(a => 
    a.created_at && isThisMonth(new Date(a.created_at))
  );

  const agendamentosPorStatus = agendamentos.reduce((acc, agendamento) => {
    acc[agendamento.status] = (acc[agendamento.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Novos filtros por status
  const agendamentosConfirmados = agendamentos.filter(a => a.status === 'confirmado');
  const agendamentosPendentes = agendamentos.filter(a => a.status === 'pendente');
  const agendamentosCancelados = agendamentos.filter(a => a.status === 'cancelado');
  const agendamentosAtendidos = agendamentos.filter(a => a.status === 'atendido');
  const agendamentosNaoAtendidos = agendamentos.filter(a => a.status === 'nao_atendido');

  // Filtrar agendamentos por status selecionado
  const agendamentosFiltrados = selectedStatus === 'todos' 
    ? agendamentos 
    : agendamentos.filter(a => a.status === selectedStatus);

  const agendamentosRecentes = agendamentosFiltrados.slice(0, 10);

  const stats = [
    { 
      title: 'Total de Agendamentos', 
      value: agendamentos.length, 
      icon: '📅', 
      color: 'bg-gradient-to-br from-yellow-400 to-orange-500',
      details: [
        `Agendamentos confirmados: ${agendamentosPorStatus.confirmado || 0}`,
        `Agendamentos pendentes: ${agendamentosPorStatus.pendente || 0}`,
        `Agendamentos cancelados: ${agendamentosPorStatus.cancelado || 0}`,
        `Total este mês: ${agendamentosMes.length}`,
        `Origem N8N: ${agendamentos.filter(a => a.origem === 'n8n').length}`
      ]
    },
    { 
      title: 'Agendamentos do Dia', 
      value: agendamentosHoje.length, 
      icon: '📆', 
      color: 'bg-gradient-to-br from-green-400 to-blue-500',
      details: agendamentosHoje.length > 0 ? 
        agendamentosHoje.map(a => `${a.nome} - ${a.pastor_selecionado || 'Pastor não definido'}`) :
        ['Nenhum agendamento hoje']
    },
    { 
      title: 'Agendamentos da Semana', 
      value: agendamentosSemana.length, 
      icon: '📊', 
      color: 'bg-gradient-to-br from-orange-400 to-red-500',
      details: agendamentosSemana.length > 0 ?
        agendamentosSemana.slice(0, 5).map(a => `${a.nome} - ${format(new Date(a.created_at), 'dd/MM', { locale: ptBR })}`) :
        ['Nenhum agendamento esta semana']
    },
    { 
      title: 'Agendamentos do Mês', 
      value: agendamentosMes.length, 
      icon: '📈', 
      color: 'bg-gradient-to-br from-blue-400 to-purple-500',
      details: agendamentosMes.length > 0 ?
        agendamentosMes.slice(0, 5).map(a => `${a.nome} - ${format(new Date(a.created_at), 'dd/MM', { locale: ptBR })}`) :
        ['Nenhum agendamento este mês']
    },
    { 
      title: 'Confirmados', 
      value: agendamentosConfirmados.length, 
      icon: '✅', 
      color: 'bg-gradient-to-br from-green-500 to-green-600',
      details: agendamentosConfirmados.length > 0 ?
        agendamentosConfirmados.slice(0, 5).map(a => `${a.nome} - ${a.pastor_selecionado || 'Pastor não definido'}`) :
        ['Nenhum agendamento confirmado']
    },
    { 
      title: 'Pendentes', 
      value: agendamentosPendentes.length, 
      icon: '⏳', 
      color: 'bg-gradient-to-br from-yellow-500 to-yellow-600',
      details: agendamentosPendentes.length > 0 ?
        agendamentosPendentes.slice(0, 5).map(a => `${a.nome} - ${a.pastor_selecionado || 'Pastor não definido'}`) :
        ['Nenhum agendamento pendente']
    },
    { 
      title: 'Cancelados', 
      value: agendamentosCancelados.length, 
      icon: '❌', 
      color: 'bg-gradient-to-br from-red-500 to-red-600',
      details: agendamentosCancelados.length > 0 ?
        agendamentosCancelados.slice(0, 5).map(a => `${a.nome} - ${a.pastor_selecionado || 'Pastor não definido'}`) :
        ['Nenhum agendamento cancelado']
    },
    { 
      title: 'Atendidos', 
      value: agendamentosAtendidos.length, 
      icon: '✔️', 
      color: 'bg-gradient-to-br from-teal-500 to-teal-600',
      details: agendamentosAtendidos.length > 0 ?
        agendamentosAtendidos.slice(0, 5).map(a => `${a.nome} - ${a.pastor_selecionado || 'Pastor não definido'}`) :
        ['Nenhum agendamento atendido']
    },
    { 
      title: 'Não Atendidos', 
      value: agendamentosNaoAtendidos.length, 
      icon: '⚠️', 
      color: 'bg-gradient-to-br from-orange-600 to-red-700',
      details: agendamentosNaoAtendidos.length > 0 ?
        agendamentosNaoAtendidos.slice(0, 5).map(a => `${a.nome} - ${a.pastor_selecionado || 'Pastor não definido'}`) :
        ['Nenhum agendamento não atendido']
    },
  ];

  const handleCardClick = (stat: any) => {
    setSelectedCard(stat);
  };

  const handleStatusChange = async (agendamentoId: string, newStatus: string) => {
    try {
      await updateAgendamento(agendamentoId, { status: newStatus });
      toast.success('Status atualizado com sucesso!', {
        duration: 3000,
        style: {
          backgroundColor: '#10B981',
          color: 'white',
          fontSize: '16px',
          padding: '16px',
        },
      });
    } catch (error) {
      // Error already handled in hook
    }
  };

  const handleDeleteAgendamento = async (agendamentoId: string) => {
    if (confirm('Tem certeza que deseja excluir este agendamento?')) {
      try {
        await deleteAgendamento(agendamentoId);
      } catch (error) {
        // Error already handled in hook
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 via-blue-50 to-green-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h2>
          <p className="text-gray-600">Acompanhe os agendamentos da igreja em tempo real</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} onClick={() => handleCardClick(stat)} className="cursor-pointer">
              <StatsCard
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                color={stat.color}
              />
            </div>
          ))}
        </div>

        <DashboardFilter
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          statusCounts={agendamentosPorStatus}
        />

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            {selectedStatus === 'todos' ? 'Agendamentos Recentes' : `Agendamentos ${
              selectedStatus === 'pendente' ? 'Pendentes' :
              selectedStatus === 'confirmado' ? 'Confirmados' :
              selectedStatus === 'atendido' ? 'Atendidos' :
              selectedStatus === 'nao_atendido' ? 'Não Atendidos' :
              selectedStatus === 'cancelado' ? 'Cancelados' : ''
            }`}
          </h3>
          <div className="space-y-4">
            {agendamentosRecentes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {selectedStatus === 'todos' ? (
                  <>
                    <p>Nenhum agendamento encontrado</p>
                    <p className="text-sm">Os agendamentos aparecerão aqui quando forem criados</p>
                  </>
                ) : (
                  <p>Nenhum agendamento encontrado para este status</p>
                )}
              </div>
            ) : (
              agendamentosRecentes.map((agendamento) => (
                <div key={agendamento.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border hover:shadow-md transition-shadow">
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{agendamento.nome}</p>
                    <p className="text-sm text-gray-600">
                      {agendamento.pastor_selecionado ? `Pastor: ${agendamento.pastor_selecionado}` : 'Pastor não definido'}
                    </p>
                    {agendamento.telefone && (
                      <p className="text-sm text-gray-600">📞 {agendamento.telefone}</p>
                    )}
                    {agendamento.tipo_agendamento && (
                      <p className="text-sm text-gray-600">💬 {agendamento.tipo_agendamento}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <p className="text-sm text-gray-600">
                        {format(new Date(agendamento.created_at), 'dd/MM/yyyy - HH:mm', { locale: ptBR })}
                      </p>
                      <span className={`inline-block px-2 py-1 text-xs rounded ${
                        agendamento.status === 'confirmado' ? 'bg-green-100 text-green-800' :
                        agendamento.status === 'cancelado' ? 'bg-red-100 text-red-800' :
                        agendamento.status === 'atendido' ? 'bg-teal-100 text-teal-800' :
                        agendamento.status === 'nao_atendido' ? 'bg-orange-100 text-orange-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {agendamento.status === 'nao_atendido' ? 'Não Atendido' :
                         agendamento.status === 'atendido' ? 'Atendido' :
                         agendamento.status ? agendamento.status.charAt(0).toUpperCase() + agendamento.status.slice(1) : 'Pendente'}
                      </span>
                      {agendamento.origem === 'n8n' && (
                        <div className="text-xs text-blue-600">📡 Via N8N</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => setSelectedAgendamento(agendamento)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                      title="Ver detalhes"
                    >
                      <Eye size={16} />
                    </button>
                    
                    <select
                      value={agendamento.status || 'pendente'}
                      onChange={(e) => handleStatusChange(agendamento.id, e.target.value)}
                      className="text-xs px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      title="Alterar status"
                    >
                      <option value="pendente">Pendente</option>
                      <option value="confirmado">Confirmado</option>
                      <option value="cancelado">Cancelado</option>
                      <option value="atendido">Atendido</option>
                      <option value="nao_atendido">Não Atendido</option>
                    </select>
                    
                    <button
                      onClick={() => handleDeleteAgendamento(agendamento.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      title="Excluir agendamento"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <CardDetailModal 
        isOpen={!!selectedCard}
        onClose={() => setSelectedCard(null)}
        cardData={selectedCard || { title: '', value: 0, icon: '', details: [] }}
      />

      {selectedAgendamento && (
        <AgendamentoDetailModal
          isOpen={!!selectedAgendamento}
          onClose={() => setSelectedAgendamento(null)}
          agendamento={selectedAgendamento}
        />
      )}
    </div>
  );
};

export default Index;
