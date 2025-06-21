
import React, { useState, useEffect } from 'react';
import { Search, AlertTriangle, Trash2 } from 'lucide-react';

interface AgendamentoFilterProps {
  onFilterChange: (nome: string, telefone: string) => void;
  duplicateResults: any[];
  isChecking: boolean;
  onCancelAgendamento?: (agendamentoId: string) => Promise<void>;
}

const AgendamentoFilter: React.FC<AgendamentoFilterProps> = ({
  onFilterChange,
  duplicateResults,
  isChecking,
  onCancelAgendamento
}) => {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (nome.length >= 2 || telefone.length >= 3) {
        console.log('Disparando busca com:', { nome, telefone });
        onFilterChange(nome, telefone);
      } else if (nome.length === 0 && telefone.length === 0) {
        onFilterChange('', '');
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [nome, telefone, onFilterChange]);

  const clearFilters = () => {
    setNome('');
    setTelefone('');
    onFilterChange('', '');
  };

  const isSearching = nome.length >= 2 || telefone.length >= 3;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Search size={20} className="text-purple-500" />
        <h3 className="text-lg font-semibold text-gray-800">
          Verificar Agendamentos Existentes
        </h3>
        {isSearching && (
          <div className="ml-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="nome-filter" className="block text-sm font-medium text-gray-700 mb-2">
            Buscar por Nome
          </label>
          <input
            type="text"
            id="nome-filter"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Digite as primeiras letras do nome"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        
        <div>
          <label htmlFor="telefone-filter" className="block text-sm font-medium text-gray-700 mb-2">
            Buscar por Telefone
          </label>
          <input
            type="text"
            id="telefone-filter"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="Digite os primeiros números do telefone"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      {(nome || telefone) && (
        <div className="flex justify-between items-center">
          <button
            onClick={clearFilters}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Limpar filtros
          </button>
        </div>
      )}

      {/* Resultados da busca */}
      {duplicateResults.length > 0 && (
        <div className="mt-4 border-t pt-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-orange-500" />
            <h4 className="font-medium text-orange-800">
              Agendamentos encontrados ({duplicateResults.length})
            </h4>
          </div>
          
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {duplicateResults.map((agendamento) => (
              <div key={agendamento.id} className="bg-orange-50 border border-orange-200 rounded p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-800">{agendamento.nome}</p>
                    <p className="text-sm text-gray-600">{agendamento.telefone}</p>
                    {agendamento.data_agendamento && (
                      <p className="text-sm text-gray-600">
                        Data: {new Date(agendamento.data_agendamento + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </p>
                    )}
                    {agendamento.pastor_selecionado && (
                      <p className="text-sm text-gray-600">
                        Pastor: {agendamento.pastor_selecionado}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      agendamento.status === 'confirmado' ? 'bg-green-100 text-green-800' :
                      agendamento.status === 'cancelado' ? 'bg-red-100 text-red-800' :
                      agendamento.status === 'atendido' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {agendamento.status === 'nao_atendido' ? 'Não Atendido' :
                      agendamento.status ? agendamento.status.charAt(0).toUpperCase() + agendamento.status.slice(1) : 'Pendente'}
                    </span>
                    
                    {onCancelAgendamento && ['pendente', 'confirmado'].includes(agendamento.status) && (
                      <button 
                        onClick={() => {
                          if (window.confirm(`Tem certeza que deseja cancelar o agendamento de ${agendamento.nome}?`)) {
                            onCancelAgendamento(agendamento.id);
                          }
                        }}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-800 hover:bg-red-200 rounded-full transition-colors"
                        title="Cancelar agendamento"
                      >
                        <Trash2 size={12} />
                        <span>Cancelar</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              <strong>Atenção:</strong> Verifique se a pessoa já possui agendamento antes de criar um novo.
              Não é possível agendar mais de uma vez no mesmo dia com qualquer pastor.
              {onCancelAgendamento && (
                <span className="block mt-1">
                  <strong>Dica:</strong> Se necessário, cancele o agendamento existente usando o botão "Cancelar" antes de criar um novo.
                </span>
              )}
            </p>
          </div>
        </div>
      )}
      
      {isSearching && duplicateResults.length === 0 && !isChecking && (
        <div className="mt-4 border-t pt-4">
          <div className="p-3 bg-green-50 border border-green-200 rounded">
            <p className="text-sm text-green-800">
              ✓ Nenhum agendamento encontrado com estes dados.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgendamentoFilter;
