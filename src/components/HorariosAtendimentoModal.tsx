
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { X } from 'lucide-react';

interface HorarioAtendimento {
  dia_semana: number;
  horario_inicio: string;
  horario_fim: string;
  ativo: boolean;
  intervalo_minutos?: number;
}

interface HorariosAtendimentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (horarios: HorarioAtendimento[]) => void;
  horariosExistentes: HorarioAtendimento[];
}

const diasSemana = [
  { valor: 0, nome: 'Domingo' },
  { valor: 1, nome: 'Segunda-feira' },
  { valor: 2, nome: 'Terça-feira' },
  { valor: 3, nome: 'Quarta-feira' },
  { valor: 4, nome: 'Quinta-feira' },
  { valor: 5, nome: 'Sexta-feira' },
  { valor: 6, nome: 'Sábado' }
];

const HorariosAtendimentoModal: React.FC<HorariosAtendimentoModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave,
  horariosExistentes 
}) => {
  const [diasSelecionados, setDiasSelecionados] = useState<number[]>([]);
  const [horarioInicio, setHorarioInicio] = useState('08:00');
  const [horarioFim, setHorarioFim] = useState('18:00');
  const [intervaloMinutos, setIntervaloMinutos] = useState(30);
  const [horariosConfigurados, setHorariosConfigurados] = useState<HorarioAtendimento[]>([]);

  useEffect(() => {
    setHorariosConfigurados(horariosExistentes);
  }, [horariosExistentes]);

  if (!isOpen) return null;

  const handleDiaChange = (dia: number) => {
    setDiasSelecionados(prev => 
      prev.includes(dia) 
        ? prev.filter(d => d !== dia)
        : [...prev, dia]
    );
  };

  const adicionarHorarios = () => {
    if (diasSelecionados.length === 0) {
      toast.error('Selecione pelo menos um dia da semana');
      return;
    }

    const novosHorarios = diasSelecionados.map(dia => ({
      dia_semana: dia,
      horario_inicio: horarioInicio,
      horario_fim: horarioFim,
      ativo: true,
      intervalo_minutos: intervaloMinutos
    }));

    const horariosAtualizados = [...horariosConfigurados];
    
    novosHorarios.forEach(novoHorario => {
      const indiceExistente = horariosAtualizados.findIndex(h => h.dia_semana === novoHorario.dia_semana);
      if (indiceExistente >= 0) {
        horariosAtualizados[indiceExistente] = novoHorario;
      } else {
        horariosAtualizados.push(novoHorario);
      }
    });

    setHorariosConfigurados(horariosAtualizados);
    setDiasSelecionados([]);
    toast.success('Horários adicionados!');
  };

  const removerHorario = (dia: number) => {
    setHorariosConfigurados(prev => prev.filter(h => h.dia_semana !== dia));
  };

  const salvarHorarios = () => {
    onSave(horariosConfigurados);
    onClose();
  };

  const formatarHorarios = () => {
    return horariosConfigurados
      .sort((a, b) => a.dia_semana - b.dia_semana)
      .map(h => {
        const dia = diasSemana.find(d => d.valor === h.dia_semana);
        return `${dia?.nome}: ${h.horario_inicio} às ${h.horario_fim}`;
      })
      .join(', ');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-800">Configurar Horários de Atendimento</h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="bg-green-50 p-4 rounded-lg mb-6">
          <h4 className="font-semibold text-gray-800 mb-3">Dias da Semana</h4>
          <div className="grid grid-cols-2 gap-2">
            {diasSemana.map(dia => (
              <label key={dia.valor} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={diasSelecionados.includes(dia.valor)}
                  onChange={() => handleDiaChange(dia.valor)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{dia.nome}</span>
              </label>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Horário Início</label>
              <input
                type="time"
                value={horarioInicio}
                onChange={(e) => setHorarioInicio(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Horário Fim</label>
              <input
                type="time"
                value={horarioFim}
                onChange={(e) => setHorarioFim(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Intervalo (min)</label>
              <select
                value={intervaloMinutos}
                onChange={(e) => setIntervaloMinutos(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={10}>10 minutos</option>
                <option value={20}>20 minutos</option>
                <option value={30}>30 minutos</option>
                <option value={40}>40 minutos</option>
                <option value={50}>50 minutos</option>
                <option value={60}>60 minutos</option>
              </select>
            </div>
          </div>

          <button
            onClick={adicionarHorarios}
            className="w-full mt-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-colors"
          >
            + Adicionar Horários
          </button>
        </div>

        {horariosConfigurados.length > 0 && (
          <div className="mb-6">
            <h4 className="font-semibold text-gray-800 mb-3">Horários Configurados:</h4>
            <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700">
              {formatarHorarios()}
            </div>
            <div className="space-y-2 mt-3">
              {horariosConfigurados
                .sort((a, b) => a.dia_semana - b.dia_semana)
                .map(horario => {
                  const dia = diasSemana.find(d => d.valor === horario.dia_semana);
                  return (
                    <div key={horario.dia_semana} className="flex items-center justify-between bg-white p-2 rounded border">
                      <span className="text-sm">
                        {dia?.nome}: {horario.horario_inicio} às {horario.horario_fim} 
                        <span className="text-blue-600 font-medium">(a cada {horario.intervalo_minutos || 30}min)</span>
                      </span>
                      <button
                        onClick={() => removerHorario(horario.dia_semana)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remover
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={salvarHorarios}
            className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-lg hover:from-green-600 hover:to-green-700 transition-colors"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

export default HorariosAtendimentoModal;
