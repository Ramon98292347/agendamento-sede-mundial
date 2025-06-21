
import React from 'react';
import { Filter } from 'lucide-react';

interface DashboardFilterProps {
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  statusCounts: Record<string, number>;
}

const DashboardFilter: React.FC<DashboardFilterProps> = ({
  selectedStatus,
  onStatusChange,
  statusCounts
}) => {
  const statusOptions = [
    { value: 'todos', label: 'Todos', count: Object.values(statusCounts).reduce((a, b) => a + b, 0) },
    { value: 'pendente', label: 'Pendentes', count: statusCounts.pendente || 0 },
    { value: 'confirmado', label: 'Confirmados', count: statusCounts.confirmado || 0 },
    { value: 'atendido', label: 'Atendidos', count: statusCounts.atendido || 0 },
    { value: 'nao_atendido', label: 'Não Atendidos', count: statusCounts.nao_atendido || 0 },
    { value: 'cancelado', label: 'Cancelados', count: statusCounts.cancelado || 0 },
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Filter size={18} className="text-blue-500" />
        <h3 className="text-lg font-semibold text-gray-800">Filtrar por Status</h3>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {statusOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onStatusChange(option.value)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              selectedStatus === option.value
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span>{option.label}</span>
            <span className={`text-xs px-2 py-1 rounded-full ${
              selectedStatus === option.value
                ? 'bg-white/20 text-white'
                : 'bg-gray-300 text-gray-600'
            }`}>
              {option.count}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default DashboardFilter;
