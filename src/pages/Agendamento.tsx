import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import AudioRecorder from '../components/AudioRecorder';
import { usePastores } from '../hooks/usePastores';
import { useAgendamentos } from '../hooks/useAgendamentos';
import { useConfiguracoesSystem } from '../hooks/useConfiguracoesSystem';
import { useEscalasPastor } from '../hooks/useEscalasPastor';
import AgendamentoFilter from '../components/AgendamentoFilter';

const Agendamento = () => {
  const { pastores, loading: pastoresLoading } = usePastores();
  const { addAgendamento, checkDuplicateAgendamento, checkExistingAgendamento } = useAgendamentos();
  const { config, validateAdminPassword } = useConfiguracoesSystem();
  const { isAdminLoggedIn, loginAdmin } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    tipoAgendamento: '',
    pastorSelecionado: '',
    dataAgendamento: '',
    horarioAgendamento: '',
    observacoes: ''
  });

  // Hook para buscar escalas e agendamentos existentes do pastor selecionado
  const { escalas, agendamentosExistentes, loading: escalasLoading } = useEscalasPastor(formData.pastorSelecionado);

  const [audioRecorded, setAudioRecorded] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');

  // Estados para o filtro de duplicatas
  const [duplicateResults, setDuplicateResults] = useState<any[]>([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: value
      };
      
      // Limpar data e horário quando trocar de pastor
      if (name === 'pastorSelecionado') {
        newData.dataAgendamento = '';
        newData.horarioAgendamento = '';
      }
      
      return newData;
    });
  };

  // Função para verificar duplicatas no filtro
  const handleFilterChange = async (nome: string, telefone: string) => {
    if (!nome && !telefone) {
      setDuplicateResults([]);
      return;
    }

    setIsCheckingDuplicates(true);
    try {
      const results = await checkDuplicateAgendamento(nome, telefone);
      console.log('Resultados da busca no filtro:', results);
      setDuplicateResults(results);
    } catch (error) {
      console.error('Erro ao verificar duplicatas:', error);
    } finally {
      setIsCheckingDuplicates(false);
    }
  };
  
  // Função para cancelar um agendamento existente
  const handleCancelAgendamento = async (agendamentoId: string) => {
    try {
      await deleteAgendamento(agendamentoId);
      // Atualizar a lista de resultados após o cancelamento
      if (formData.nome || formData.telefone) {
        handleFilterChange(formData.nome, formData.telefone);
      }
      toast.success('Agendamento cancelado com sucesso! Agora você pode fazer um novo agendamento.');
    } catch (error) {
      console.error('Erro ao cancelar agendamento:', error);
      toast.error('Erro ao cancelar agendamento');
    }
  };

  // Função para verificar se já existe agendamento quando selecionar data
  useEffect(() => {
    const checkForExistingAgendamento = async () => {
      // Verificar assim que o usuário selecionar uma data e tiver nome e telefone preenchidos
      if (formData.nome && formData.telefone && formData.dataAgendamento) {
        console.log('Verificando agendamentos existentes automaticamente...');
        try {
          const existingAgendamentos = await checkExistingAgendamento(
            formData.nome,
            formData.telefone,
            formData.dataAgendamento
          );
          
          if (existingAgendamentos.length > 0) {
            // Não permitir agendamento no mesmo dia com qualquer pastor
            toast.error(
              `⚠️ AGENDAMENTO DUPLICADO!\n\n${formData.nome} já possui agendamento no dia ${new Date(formData.dataAgendamento + 'T00:00:00').toLocaleDateString('pt-BR')}.\n\nNão é possível agendar mais de uma vez no mesmo dia.\n\nPor favor, cancele o agendamento existente antes de fazer um novo.`,
              {
                duration: 8000,
              }
            );
            
            // Limpar os campos de data e horário
            setFormData(prev => ({
              ...prev,
              dataAgendamento: '',
              horarioAgendamento: ''
            }));
            
            // Atualizar a lista de resultados para mostrar o agendamento existente
            if (formData.nome || formData.telefone) {
              handleFilterChange(formData.nome, formData.telefone);
            }
          }
        } catch (error) {
          console.error('Erro ao verificar agendamentos existentes:', error);
        }
      }
    };

    // Debounce para evitar muitas chamadas
    const timer = setTimeout(checkForExistingAgendamento, 1000);
    return () => clearTimeout(timer);
  }, [formData.nome, formData.telefone, formData.dataAgendamento]);

  // Obter datas disponíveis únicas
  const datasDisponiveis = [...new Set(escalas.map(escala => escala.data_disponivel))];

  // Função para gerar horários de 30 em 30 minutos
  const generateTimeSlots = (startTime: string, endTime: string) => {
    const slots = [];
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    
    let current = new Date(start);
    
    while (current < end) {
      const timeString = current.toTimeString().slice(0, 5);
      slots.push(timeString);
      current.setMinutes(current.getMinutes() + 30);
    }
    
    return slots;
  };

  // Obter horários já agendados para a data selecionada do pastor atual
  const horariosJaAgendados = agendamentosExistentes
    .filter(agendamento => agendamento.data_agendamento === formData.dataAgendamento)
    .map(agendamento => {
      // Normalizar o horário para formato HH:MM (remover segundos se existir)
      const horario = agendamento.horario_agendamento;
      return horario ? horario.slice(0, 5) : '';
    })
    .filter(horario => horario !== ''); // Remover horários vazios

  console.log('Horários já agendados para', formData.pastorSelecionado, 'na data', formData.dataAgendamento, ':', horariosJaAgendados);

  // Obter horários disponíveis para a data selecionada, excluindo os já agendados
  const horariosDisponiveis = escalas
    .filter(escala => escala.data_disponivel === formData.dataAgendamento)
    .flatMap(escala => {
      const timeSlots = generateTimeSlots(escala.horario_inicio, escala.horario_fim);
      const horariosLivres = timeSlots.filter(slot => !horariosJaAgendados.includes(slot));
      
      console.log('Horários gerados para escala:', timeSlots);
      console.log('Horários livres após filtrar agendados:', horariosLivres);
      
      return horariosLivres.map(slot => ({
        horario: slot,
        escala_id: escala.id
      }));
    });

  const handleAudioRecorded = (url: string, blob: Blob) => {
    setAudioUrl(url);
    setAudioBlob(blob);
    setAudioRecorded(true);
    toast.success('Áudio gravado com sucesso!');
  };

  const convertBlobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove o prefixo "data:audio/wav;base64,"
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação condicional baseada no áudio
    if (audioRecorded) {
      if (!formData.nome || !formData.telefone) {
        toast.error('Para envio com áudio, nome e telefone são obrigatórios');
        return;
      }
    } else {
      if (!formData.nome || !formData.telefone || !formData.tipoAgendamento || !formData.pastorSelecionado || !formData.dataAgendamento) {
        toast.error('Por favor, preencha todos os campos obrigatórios ou grave um áudio');
        return;
      }

      // Verificação final antes de enviar
      try {
        const existingAgendamentos = await checkExistingAgendamento(
          formData.nome,
          formData.telefone,
          formData.dataAgendamento
        );

        if (existingAgendamentos.length > 0) {
          toast.error(
            `⚠️ NÃO É POSSÍVEL CRIAR AGENDAMENTO!\n\n${formData.nome} já possui agendamento no dia ${new Date(formData.dataAgendamento + 'T00:00:00').toLocaleDateString('pt-BR')}.\n\nNão é permitido agendar mais de uma vez no mesmo dia com qualquer pastor.\n\nPor favor, cancele o agendamento existente antes de fazer um novo.`,
            {
              duration: 8000,
            }
          );
          
          // Atualizar a lista de resultados para mostrar o agendamento existente
          handleFilterChange(formData.nome, formData.telefone);
          return;
        }
      } catch (error) {
        console.error('Erro ao verificar duplicatas finais:', error);
        toast.error('Erro ao verificar agendamentos existentes');
        return;
      }
    }

    try {
      // Preparar dados para o webhook
      const webhookData: any = {
        nome: formData.nome,
        telefone: formData.telefone,
        email: formData.email || null,
        tipo_agendamento: formData.tipoAgendamento || null,
        pastor_selecionado: formData.pastorSelecionado || null,
        data_agendamento: formData.dataAgendamento || null,
        horario_agendamento: formData.horarioAgendamento || null,
        observacoes: formData.observacoes || null,
        timestamp: new Date().toISOString(),
        origem: 'webapp'
      };

      if (audioBlob) {
        const audioBase64 = await convertBlobToBase64(audioBlob);
        webhookData.audio_base64 = audioBase64;
      }

      const response = await fetch('https://webhookn8n.rfautomatic.click/webhook/agendamento', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData),
      });

      if (!response.ok) {
        throw new Error('Erro ao enviar dados para o webhook');
      }

      await addAgendamento({
        nome: formData.nome,
        telefone: formData.telefone,
        email: formData.email || undefined,
        tipo_agendamento: formData.tipoAgendamento || undefined,
        pastor_selecionado: formData.pastorSelecionado || undefined,
        data_agendamento: formData.dataAgendamento || undefined,
        horario_agendamento: formData.horarioAgendamento || undefined,
        observacoes: formData.observacoes || undefined,
        audio_url: audioUrl || undefined,
        status: 'pendente',
        origem: 'webapp'
      });

      setFormData({
        nome: '',
        telefone: '',
        email: '',
        tipoAgendamento: '',
        pastorSelecionado: '',
        dataAgendamento: '',
        horarioAgendamento: '',
        observacoes: ''
      });
      setAudioRecorded(false);
      setAudioUrl('');
      setAudioBlob(null);
      
      toast.success('Agendamento enviado com sucesso!');
    } catch (error) {
      console.error('Erro ao enviar agendamento:', error);
      toast.error('Erro ao enviar agendamento');
    }
  };

  const handleAdminLogin = () => {
    if (validateAdminPassword(adminPassword)) {
      loginAdmin();
      setShowAdminLogin(false);
      setAdminPassword('');
      toast.success('Login admin realizado com sucesso!');
      navigate('/dashboard');
    } else {
      toast.error('Senha incorreta!');
    }
  };

  // Pegar as configurações do sistema de forma mais segura
  const systemConfig = config ? {
    horarios: config.horarios_funcionamento || {
      segunda_sexta: 'Segunda a Sexta: 9h às 18h',
      domingo: 'Domingo: Apenas emergências'
    },
    contatos: config.contatos || {
      telefone: '(11) 1234-5678',
      email: 'contato@ipda.org.br',
      endereco: 'Rua da Igreja, 123'
    },
    informacoes: config.informacoes || {
      antecedencia: 'Os agendamentos devem ser feitos com pelo menos 24h de antecedência',
      confirmacao: 'Confirme seu agendamento ligando para a secretaria',
      emergencia: 'Em caso de emergência, procure a liderança da igreja'
    }
  } : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 via-blue-50 to-green-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 relative">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-2xl">IPDA</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Igreja Pentecostal</h1>
              <p className="text-lg text-gray-600">Deus é Amor</p>
            </div>
          </div>
          
          {/* Botões Admin e Pastor - Lado a lado */}
          <div className="absolute top-0 right-0 flex space-x-2">
            <button
              onClick={() => setShowAdminLogin(true)}
              className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 sm:px-4 sm:py-2 rounded-lg font-medium transition-colors flex items-center space-x-1 text-xs sm:text-sm md:text-base shadow-lg"
            >
              <span className="text-sm sm:text-base">🏠</span>
              <span>Admin</span>
            </button>
            
            <button
              onClick={() => navigate('/pastor-login')}
              className="bg-purple-500 hover:bg-purple-600 text-white px-2 py-1 sm:px-4 sm:py-2 rounded-lg font-medium transition-colors flex items-center space-x-1 text-xs sm:text-sm md:text-base shadow-lg"
            >
              <span className="text-sm sm:text-base">👨‍💼</span>
              <span>Pastor</span>
            </button>
          </div>

          <h2 className="text-2xl font-semibold text-gray-700 mb-2">Agendamento de Consulta</h2>
          <p className="text-gray-600">Preencha os dados abaixo para agendar uma consulta com nossos pastores</p>
        </div>

        {/* Modal Admin Login - Com logo da igreja */}
        {showAdminLogin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg w-full max-w-md">
              {/* Logo da Igreja */}
              <div className="flex items-center justify-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white font-bold text-xl">IPDA</span>
                </div>
                <div className="text-center">
                  <h4 className="text-sm font-bold text-gray-800">Igreja Pentecostal</h4>
                  <p className="text-xs text-gray-600">Deus é Amor</p>
                </div>
              </div>
              
              <h3 className="text-lg font-bold mb-4 text-center">Acesso Administrativo</h3>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Digite a senha"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
                onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
              />
              <div className="flex space-x-2">
                <button
                  onClick={handleAdminLogin}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg"
                >
                  Entrar
                </button>
                <button
                  onClick={() => {
                    setShowAdminLogin(false);
                    setAdminPassword('');
                  }}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filtro para verificar duplicatas */}
        <AgendamentoFilter
          onFilterChange={handleFilterChange}
          duplicateResults={duplicateResults}
          isChecking={isCheckingDuplicates}
          onCancelAgendamento={handleCancelAgendamento}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulário */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Dados Pessoais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-2">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    id="nome"
                    name="nome"
                    value={formData.nome}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Digite seu nome completo"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="telefone" className="block text-sm font-medium text-gray-700 mb-2">
                    Telefone *
                  </label>
                  <input
                    type="tel"
                    id="telefone"
                    name="telefone"
                    value={formData.telefone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="(11) 99999-9999"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  E-mail
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="contato@ipda.org.br"
                />
              </div>

              {/* Campos condicionais - só mostram se não tiver áudio */}
              {!audioRecorded && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="tipoAgendamento" className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo de Agendamento *
                      </label>
                      <select
                        id="tipoAgendamento"
                        name="tipoAgendamento"
                        value={formData.tipoAgendamento}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        required={!audioRecorded}
                      >
                        <option value="">Selecione o tipo</option>
                        <option value="aconselhamento">Aconselhamento</option>
                        <option value="oracao">Oração</option>
                        <option value="estudoBiblico">Estudo Bíblico</option>
                        <option value="visitaPastoral">Visita Pastoral</option>
                        <option value="casamento">Casamento</option>
                        <option value="batismo">Batismo</option>
                        <option value="outro">Outro</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="pastorSelecionado" className="block text-sm font-medium text-gray-700 mb-2">
                        Selecione o Pastor *
                      </label>
                      <select
                        id="pastorSelecionado"
                        name="pastorSelecionado"
                        value={formData.pastorSelecionado}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        required={!audioRecorded}
                        disabled={pastoresLoading}
                      >
                        <option value="">
                          {pastoresLoading ? 'Carregando pastores...' : 'Escolha um pastor'}
                        </option>
                        {pastores.map((pastor) => (
                          <option key={pastor.id} value={pastor.nome}>
                            {pastor.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="dataAgendamento" className="block text-sm font-medium text-gray-700 mb-2">
                        Data do Agendamento *
                      </label>
                      <select
                        id="dataAgendamento"
                        name="dataAgendamento"
                        value={formData.dataAgendamento}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        disabled={!formData.pastorSelecionado || escalasLoading}
                      >
                        <option value="">
                          {!formData.pastorSelecionado 
                            ? 'Selecione um pastor primeiro' 
                            : escalasLoading 
                            ? 'Carregando datas...' 
                            : datasDisponiveis.length === 0 
                            ? 'Nenhuma data disponível' 
                            : 'Selecione uma data'}
                        </option>
                        {datasDisponiveis.map((data) => (
                          <option key={data} value={data}>
                            {new Date(data + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="horarioAgendamento" className="block text-sm font-medium text-gray-700 mb-2">
                        Horário *
                      </label>
                      <select
                        id="horarioAgendamento"
                        name="horarioAgendamento"
                        value={formData.horarioAgendamento}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        disabled={!formData.dataAgendamento}
                      >
                        <option value="">
                          {!formData.dataAgendamento 
                            ? 'Selecione uma data primeiro' 
                            : horariosDisponiveis.length === 0 
                            ? 'Nenhum horário disponível' 
                            : 'Selecione um horário'}
                        </option>
                        {horariosDisponiveis.map((horario, index) => (
                          <option key={index} value={horario.horario}>
                            {horario.horario}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="observacoes" className="block text-sm font-medium text-gray-700 mb-2">
                      Assunto *
                    </label>
                    <textarea
                      id="observacoes"
                      name="observacoes"
                      value={formData.observacoes}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="Descreva o motivo do agendamento"
                    />
                  </div>
                </>
              )}

              {/* Gravador de Áudio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gravação de Áudio {audioRecorded && '✓'}
                </label>
                <AudioRecorder onAudioRecorded={handleAudioRecorded} />
                {audioRecorded && (
                  <p className="text-sm text-green-600 mt-2">
                    ✓ Áudio gravado! Agora só é necessário preencher nome e telefone.
                  </p>
                )}
              </div>

              {/* Botão de Envio */}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-green-400 to-blue-500 text-white font-bold py-4 px-6 rounded-lg shadow-lg hover:from-green-500 hover:to-blue-600 transform hover:scale-105 transition-all duration-200"
              >
                {audioRecorded ? 'Enviar Agendamento com Áudio' : 'Enviar Agendamento'}
              </button>
            </form>
          </div>

          {/* Informações Laterais - Usando as configurações do sistema */}
          <div className="space-y-6">
            {/* Informações de Contato */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <span className="text-pink-500 mr-2">📞</span>
                Informações de Contato
              </h3>
              <div className="space-y-3">
                <p className="text-sm text-gray-600 flex items-center">
                  <span className="text-pink-500 mr-2">📞</span>
                  {systemConfig?.contatos.telefone || '(11) 1234-5678'}
                </p>
                <p className="text-sm text-gray-600 flex items-center">
                  <span className="text-purple-500 mr-2">✉️</span>
                  {systemConfig?.contatos.email || 'contato@ipda.org.br'}
                </p>
                <p className="text-sm text-gray-600 flex items-center">
                  <span className="text-pink-500 mr-2">📍</span>
                  {systemConfig?.contatos.endereco || 'Rua da Igreja, 123'}
                </p>
              </div>
            </div>

            {/* Horários de Funcionamento */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <span className="text-gray-600 mr-2">🕐</span>
                Horários de Funcionamento
              </h3>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">{systemConfig?.horarios.segunda_sexta || 'Quarta a Sexta: 8:00 h às 18:00 h'}</p>
                <p className="text-sm text-gray-600">{systemConfig?.horarios.domingo || 'Domingo: Apenas emergências'}</p>
              </div>
            </div>

            {/* Informações Importantes */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-orange-800 mb-4 flex items-center">
                <span className="text-blue-500 mr-2">ℹ️</span>
                Informações Importantes
              </h3>
              <div className="space-y-3">
                <p className="text-sm text-orange-700 flex items-start">
                  <span className="text-yellow-600 mr-2 mt-0.5">⚠️</span>
                  {systemConfig?.informacoes.antecedencia || 'Os agendamentos devem ser feitos com pelo menos 24h de antecedência'}
                </p>
                <p className="text-sm text-orange-700 flex items-start">
                  <span className="text-pink-500 mr-2 mt-0.5">📞</span>
                  {systemConfig?.informacoes.confirmacao || 'Confirme seu agendamento ligando para a secretaria'}
                </p>
                <p className="text-sm text-orange-700 flex items-start">
                  <span className="text-red-500 mr-2 mt-0.5">🚨</span>
                  {systemConfig?.informacoes.emergencia || 'Em caso de emergência, procure a liderança da igreja'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Agendamento;
