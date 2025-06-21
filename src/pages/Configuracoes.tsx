import React, { useState } from 'react';
import Header from '../components/Header';
import { toast } from 'sonner';
import SystemConfigModal from '../components/SystemConfigModal';
import MultipleDatePicker from '../components/MultipleDatePicker';
import GoogleCalendarConfig from '../components/GoogleCalendarConfig';
import { usePastores } from '../hooks/usePastores';
import { useEscalas } from '../hooks/useEscalas';
import { useConfiguracoesSystem } from '../hooks/useConfiguracoesSystem';
import { format } from 'date-fns';

const Configuracoes = () => {
  const { pastores, addPastor, deletePastor, loading: pastoresLoading } = usePastores();
  const { escalas, addMultipleEscalas, deleteEscala, loading: escalasLoading } = useEscalas();
  const { config, updateConfig, loading: configLoading } = useConfiguracoesSystem();

  const [escalaData, setEscalaData] = useState({
    pastorId: '',
    datasDisponiveis: [] as Date[],
    horarioInicio: '',
    horarioFim: '',
    intervaloMinutos: 30,
    intervaloAlmoco: {
      inicio: '12:00',
      fim: '13:00'
    },
    habilitarIntervaloAlmoco: false
  });

  const [novoPastor, setNovoPastor] = useState({
    nome: '',
    senha: ''
  });
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEscalaData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePastorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNovoPastor(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDatesChange = (dates: Date[]) => {
    setEscalaData(prev => ({
      ...prev,
      datasDisponiveis: dates
    }));
  };

  const handleSubmitEscala = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!escalaData.pastorId || escalaData.datasDisponiveis.length === 0 || !escalaData.horarioInicio || !escalaData.horarioFim) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    try {
      await addMultipleEscalas({
        pastor_id: escalaData.pastorId,
        datas_disponiveis: escalaData.datasDisponiveis.map(date => format(date, 'yyyy-MM-dd')),
        horario_inicio: escalaData.horarioInicio,
        horario_fim: escalaData.horarioFim,
        intervalo_minutos: escalaData.intervaloMinutos,
        intervalo_almoco: escalaData.habilitarIntervaloAlmoco ? escalaData.intervaloAlmoco : undefined
      });
      
      setEscalaData({
        pastorId: '',
        datasDisponiveis: [],
        horarioInicio: '',
        horarioFim: '',
        intervaloMinutos: 30,
        intervaloAlmoco: {
          inicio: '12:00',
          fim: '13:00'
        },
        habilitarIntervaloAlmoco: false
      });
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const handleAddPastor = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!novoPastor.nome.trim() || !novoPastor.senha.trim()) {
      toast.error('Por favor, preencha o nome e a senha do pastor');
      return;
    }

    try {
      await addPastor(novoPastor.nome.trim(), novoPastor.senha.trim());
      setNovoPastor({ nome: '', senha: '' });
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const handleSaveSystemConfig = async (newConfig: any) => {
    try {
      await updateConfig({
        horarios_funcionamento: newConfig.horarios,
        contatos: newConfig.contatos,
        informacoes: newConfig.informacoes
      });
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const systemConfig = config ? {
    horarios: config.horarios_funcionamento || {},
    contatos: config.contatos || {},
    informacoes: config.informacoes || {}
  } : null;

  if (pastoresLoading || escalasLoading || configLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-100 via-blue-50 to-green-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-xl text-gray-600">Carregando...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 via-blue-50 to-green-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Configurações</h2>
          <p className="text-gray-600">Gerencie pastores, escalas e configurações do sistema</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cadastro de Pastores */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-6">👨‍💼 Cadastro de Pastores</h3>
            
            <form onSubmit={handleAddPastor} className="space-y-4 mb-6">
              <div>
                <label htmlFor="novoPastor" className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Pastor *
                </label>
                <input
                  type="text"
                  id="novoPastor"
                  name="nome"
                  value={novoPastor.nome}
                  onChange={handlePastorInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Ex: Pr. João Silva"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="senhaPastor" className="block text-sm font-medium text-gray-700 mb-2">
                  Senha do Pastor *
                </label>
                <input
                  type="password"
                  id="senhaPastor"
                  name="senha"
                  value={novoPastor.senha}
                  onChange={handlePastorInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Digite a senha"
                  required
                />
              </div>
              
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-green-400 to-blue-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:from-green-500 hover:to-blue-600 transform hover:scale-105 transition-all duration-200"
              >
                Adicionar Pastor
              </button>
            </form>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              <h4 className="font-semibold text-gray-700">Pastores Cadastrados:</h4>
              {pastores.length === 0 ? (
                <p className="text-gray-500 text-sm">Nenhum pastor cadastrado</p>
              ) : (
                pastores.map((pastor) => (
                  <div key={pastor.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span className="text-sm text-gray-700">{pastor.nome}</span>
                    <button
                      onClick={() => deletePastor(pastor.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remover
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Formulário para Adicionar Escala */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-6">➕ Adicionar Nova Escala</h3>
            
            <form onSubmit={handleSubmitEscala} className="space-y-6">
              <div>
                <label htmlFor="pastorId" className="block text-sm font-medium text-gray-700 mb-2">
                  Selecione o Pastor *
                </label>
                <select
                  id="pastorId"
                  name="pastorId"
                  value={escalaData.pastorId}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  required
                >
                  <option value="">Selecione um pastor</option>
                  {pastores.map((pastor) => (
                    <option key={pastor.id} value={pastor.id}>
                      {pastor.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Datas Disponíveis *
                </label>
                <MultipleDatePicker
                  selectedDates={escalaData.datasDisponiveis}
                  onDatesChange={handleDatesChange}
                  placeholder="Selecione as datas disponíveis"
                />
              </div>

              <div>
                <label htmlFor="horarioInicio" className="block text-sm font-medium text-gray-700 mb-2">
                  Horário de Início *
                </label>
                <input
                  type="time"
                  id="horarioInicio"
                  name="horarioInicio"
                  value={escalaData.horarioInicio}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  required
                />
              </div>

              <div>
                <label htmlFor="horarioFim" className="block text-sm font-medium text-gray-700 mb-2">
                  Horário de Saída *
                </label>
                <input
                  type="time"
                  id="horarioFim"
                  name="horarioFim"
                  value={escalaData.horarioFim}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  required
                />
              </div>

              <div>
                <label htmlFor="intervaloMinutos" className="block text-sm font-medium text-gray-700 mb-2">
                  Intervalo entre Agendamentos (minutos)
                </label>
                <select
                  id="intervaloMinutos"
                  name="intervaloMinutos"
                  value={escalaData.intervaloMinutos}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value="10">10 minutos</option>
                  <option value="15">15 minutos</option>
                  <option value="20">20 minutos</option>
                  <option value="30">30 minutos</option>
                  <option value="45">45 minutos</option>
                  <option value="60">60 minutos</option>
                </select>
              </div>

              <div className="space-y-4 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="habilitarIntervaloAlmoco"
                    name="habilitarIntervaloAlmoco"
                    checked={escalaData.habilitarIntervaloAlmoco}
                    onChange={(e) => setEscalaData(prev => ({
                      ...prev,
                      habilitarIntervaloAlmoco: e.target.checked
                    }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="habilitarIntervaloAlmoco" className="ml-2 block text-sm font-medium text-gray-700">
                    Habilitar Intervalo de Almoço
                  </label>
                </div>

                {escalaData.habilitarIntervaloAlmoco && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="intervaloAlmocoInicio" className="block text-sm font-medium text-gray-700 mb-2">
                        Início do Almoço
                      </label>
                      <input
                        type="time"
                        id="intervaloAlmocoInicio"
                        value={escalaData.intervaloAlmoco.inicio}
                        onChange={(e) => setEscalaData(prev => ({
                          ...prev,
                          intervaloAlmoco: {
                            ...prev.intervaloAlmoco,
                            inicio: e.target.value
                          }
                        }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      />
                    </div>
                    <div>
                      <label htmlFor="intervaloAlmocoFim" className="block text-sm font-medium text-gray-700 mb-2">
                        Fim do Almoço
                      </label>
                      <input
                        type="time"
                        id="intervaloAlmocoFim"
                        value={escalaData.intervaloAlmoco.fim}
                        onChange={(e) => setEscalaData(prev => ({
                          ...prev,
                          intervaloAlmoco: {
                            ...prev.intervaloAlmoco,
                            fim: e.target.value
                          }
                        }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-green-400 to-blue-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:from-green-500 hover:to-blue-600 transform hover:scale-105 transition-all duration-200"
              >
                Adicionar Escala
              </button>
            </form>
          </div>

          {/* Lista de Escalas Existentes */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-6">📅 Escalas Cadastradas</h3>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {escalas.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nenhuma escala cadastrada</p>
              ) : (
                escalas.map((escala) => (
                  <div key={escala.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-800">{escala.pastores?.nome}</h4>
                        <p className="text-sm text-gray-600">
                          📅 {new Date(escala.data_disponivel + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-sm text-gray-600">
                          🕐 {escala.horario_inicio} às {escala.horario_fim}
                        </p>
                        <p className="text-sm text-gray-600">
                          ⏱️ Intervalo: {escala.intervalo_minutos || 30} minutos
                        </p>
                        {escala.intervalo_almoco && (
                          <p className="text-sm text-gray-600">
                            🍽️ Almoço: {
                              typeof escala.intervalo_almoco === 'string' 
                                ? JSON.parse(escala.intervalo_almoco as string).inicio + ' às ' + JSON.parse(escala.intervalo_almoco as string).fim
                                : (escala.intervalo_almoco as any).inicio + ' às ' + (escala.intervalo_almoco as any).fim
                            }
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => deleteEscala(escala.id)}
                        className="bg-gradient-to-r from-red-400 to-red-500 text-white px-3 py-1 rounded-lg text-sm hover:from-red-500 hover:to-red-600 transition-colors"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Configuração do Google Calendar */}
        <div className="mt-8">
          <GoogleCalendarConfig />
        </div>

        {/* Configurações do Sistema */}
        {systemConfig && (
          <div className="mt-8 space-y-8">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800">⚙️ Configurações do Sistema</h3>
                <button
                  onClick={() => setIsConfigModalOpen(true)}
                  className="bg-gradient-to-r from-blue-400 to-purple-500 text-white font-bold py-2 px-4 rounded-lg shadow-lg hover:from-blue-500 hover:to-purple-600 transform hover:scale-105 transition-all duration-200"
                >
                  ✏️ Editar
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-700">Horários de Funcionamento</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">{systemConfig.horarios.segunda_sexta}</p>
                    <p className="text-sm text-gray-600">{systemConfig.horarios.domingo}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-700">Contatos da Igreja</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">📞 Telefone: {systemConfig.contatos.telefone}</p>
                    <p className="text-sm text-gray-600">✉️ Email: {systemConfig.contatos.email}</p>
                    <p className="text-sm text-gray-600">📍 Endereço: {systemConfig.contatos.endereco}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal de edição das configurações */}
      {systemConfig && (
        <SystemConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          config={systemConfig}
          onSave={handleSaveSystemConfig}
        />
      )}
    </div>
  );
};

export default Configuracoes;
