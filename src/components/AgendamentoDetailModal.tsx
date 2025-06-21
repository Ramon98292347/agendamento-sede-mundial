
import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X } from 'lucide-react';

interface AgendamentoDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  agendamento: any;
}

const AgendamentoDetailModal: React.FC<AgendamentoDetailModalProps> = ({ 
  isOpen, 
  onClose, 
  agendamento 
}) => {
  if (!isOpen || !agendamento) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800">Detalhes do Agendamento</h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{agendamento.nome}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
            <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{agendamento.telefone}</p>
          </div>

          {agendamento.email && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{agendamento.email}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Agendamento</label>
            <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
              {agendamento.tipo_agendamento || 'Não especificado'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pastor Selecionado</label>
            <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
              {agendamento.pastor_selecionado || 'Não definido'}
            </p>
          </div>

          {agendamento.data_agendamento && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data do Agendamento</label>
              <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                {format(new Date(agendamento.data_agendamento + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
              </p>
            </div>
          )}

          {agendamento.horario_agendamento && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Horário</label>
              <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{agendamento.horario_agendamento}</p>
            </div>
          )}

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

          {agendamento.observacoes && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assunto/Observações</label>
              <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{agendamento.observacoes}</p>
            </div>
          )}

          {/* Seção para Assuntos Tratados pelo Pastor */}
          {agendamento.anotacoes_pastor && (
            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Assuntos Tratados pelo Pastor</label>
              <div className="text-gray-900 bg-blue-50 border border-blue-200 p-3 rounded-lg">
                <p className="whitespace-pre-wrap">{agendamento.anotacoes_pastor}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data de Criação</label>
            <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
              {format(new Date(agendamento.created_at), 'dd/MM/yyyy - HH:mm', { locale: ptBR })}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Origem</label>
            <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
              {agendamento.origem === 'n8n' ? 'N8N (Automático)' : 'Manual'}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gradient-to-r from-gray-400 to-gray-500 text-white px-4 py-2 rounded-lg hover:from-gray-500 hover:to-gray-600 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgendamentoDetailModal;
