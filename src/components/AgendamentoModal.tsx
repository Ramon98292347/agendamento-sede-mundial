
import React, { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X, Save } from 'lucide-react';
import { toast } from 'sonner';

interface AgendamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  agendamento: any;
  onSave: (id: string, anotacoes: string) => Promise<void>;
}

const AgendamentoModal: React.FC<AgendamentoModalProps> = ({ 
  isOpen, 
  onClose, 
  agendamento,
  onSave
}) => {
  const [anotacoes, setAnotacoes] = useState(agendamento?.anotacoes_pastor || '');
  const [saving, setSaving] = useState(false);

  if (!isOpen || !agendamento) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(agendamento.id, anotacoes);
      toast.success('Anotações salvas com sucesso!');
      onClose();
    } catch (error) {
      toast.error('Erro ao salvar anotações');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-800">Detalhes do Agendamento</h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{agendamento.nome}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{agendamento.telefone}</p>
            </div>
          </div>

          {agendamento.email && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{agendamento.email}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Agendamento</label>
              <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                {agendamento.tipo_agendamento || 'Não especificado'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <span className={`inline-block px-3 py-1 text-sm rounded-full ${
                agendamento.status === 'confirmado' ? 'bg-green-100 text-green-800' :
                agendamento.status === 'cancelado' ? 'bg-red-100 text-red-800' :
                agendamento.status === 'atendido' ? 'bg-blue-100 text-blue-800' :
                agendamento.status === 'nao_atendido' ? 'bg-orange-100 text-orange-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {agendamento.status === 'nao_atendido' ? 'Não Atendido' :
                 agendamento.status === 'atendido' ? 'Atendido' :
                 agendamento.status ? agendamento.status.charAt(0).toUpperCase() + agendamento.status.slice(1) : 'Pendente'}
              </span>
            </div>
          </div>

          {agendamento.data_agendamento && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data do Agendamento</label>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                  {format(new Date(agendamento.data_agendamento + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                </p>
              </div>

              {agendamento.horario_agendamento && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Horário</label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{agendamento.horario_agendamento}</p>
                </div>
              )}
            </div>
          )}

          {agendamento.observacoes && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assunto/Observações</label>
              <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{agendamento.observacoes}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data de Criação</label>
            <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
              {format(new Date(agendamento.created_at), 'dd/MM/yyyy - HH:mm', { locale: ptBR })}
            </p>
          </div>
        </div>

        {/* Campo para anotações do pastor */}
        <div className="border-t pt-6">
          <div>
            <label htmlFor="anotacoes" className="block text-sm font-medium text-gray-700 mb-2">
              Assuntos Tratados / Anotações do Pastor
            </label>
            <textarea
              id="anotacoes"
              value={anotacoes}
              onChange={(e) => setAnotacoes(e.target.value)}
              placeholder="Digite aqui as anotações sobre o atendimento, assuntos tratados, observações importantes..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              rows={4}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? 'Salvando...' : 'Salvar Anotações'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgendamentoModal;
