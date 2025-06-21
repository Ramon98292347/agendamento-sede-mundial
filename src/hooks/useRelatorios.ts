
import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Extend jsPDF with autoTable method
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export const useRelatorios = () => {
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pendentes: 0,
    confirmados: 0,
    atendidos: 0,
    cancelados: 0,
    naoAtendidos: 0
  });

  const fetchAllAgendamentos = async () => {
    try {
      setLoading(true);
      console.log('🔍 Iniciando busca de agendamentos...');
      
      // Buscar dados do histórico
    console.log('🔍 Buscando dados do histórico...');
    const { data: historicoData, error: historicoError } = await supabase
      .from('agendamentos_historico')
      .select('*')
      .order('created_at', { ascending: false });

      if (historicoError) {
        console.error('❌ Erro ao buscar histórico:', historicoError);
      } else {
        console.log('✅ Dados do histórico encontrados:', historicoData?.length || 0, 'registros');
        console.log('📊 Dados do histórico:', historicoData);
      }

      // Buscar dados da tabela agendamentos também
      console.log('📅 Buscando agendamentos ativos...');
      const { data: agendamentosData, error: agendamentosError } = await supabase
        .from('agendamentos')
        .select('*')
        .order('created_at', { ascending: false });

      if (agendamentosError) {
        console.error('❌ Erro ao buscar agendamentos:', agendamentosError);
      } else {
        console.log('✅ Agendamentos ativos encontrados:', agendamentosData?.length || 0, 'registros');
        console.log('📊 Agendamentos ativos:', agendamentosData);
      }

      // Combinar os dados das duas tabelas
      const todosAgendamentos = [
        ...(historicoData || []),
        ...(agendamentosData || [])
      ];

      console.log('🔗 Total de agendamentos combinados:', todosAgendamentos.length);
      console.log('📈 Dados finais:', todosAgendamentos);

      setAgendamentos(todosAgendamentos);
    } catch (error) {
      console.error('💥 Erro geral ao buscar agendamentos:', error);
    } finally {
      setLoading(false);
      console.log('✅ Busca finalizada');
    }
  };

  useEffect(() => {
    fetchAllAgendamentos();
  }, []);

  useEffect(() => {
    const newStats = {
      total: agendamentos.length,
      pendentes: agendamentos.filter(a => a.status === 'pendente').length,
      confirmados: agendamentos.filter(a => a.status === 'confirmado').length,
      atendidos: agendamentos.filter(a => a.status === 'atendido').length,
      cancelados: agendamentos.filter(a => a.status === 'cancelado').length,
      naoAtendidos: agendamentos.filter(a => a.status === 'nao_atendido').length
    };
    setStats(newStats);
  }, [agendamentos]);

  const exportToExcel = () => {
    try {
      const ws = XLSX.utils.json_to_sheet(agendamentos.map(agendamento => ({
        'Nome': agendamento.nome,
        'Telefone': agendamento.telefone,
        'Email': agendamento.email || 'N/A',
        'Tipo': agendamento.tipo_agendamento || 'N/A',
        'Pastor': agendamento.pastor_selecionado || 'N/A',
        'Data': agendamento.data_agendamento ? new Date(agendamento.data_agendamento + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A',
        'Horário': agendamento.horario_agendamento || 'N/A',
        'Status': agendamento.status,
        'Observações': agendamento.observacoes || 'N/A',
        'Criado em': new Date(agendamento.created_at).toLocaleDateString('pt-BR')
      })));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Agendamentos');
      XLSX.writeFile(wb, `agendamentos_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      throw error;
    }
  };

  const exportToPDF = () => {
    try {
      // Verificar se há dados para exportar
      if (!agendamentos || agendamentos.length === 0) {
        throw new Error('Não há agendamentos para exportar');
      }

      console.log('Iniciando exportação PDF...');
      console.log('Total de agendamentos:', agendamentos.length);
      
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      console.log('Documento PDF criado');
      
      // Header
      doc.setFontSize(18);
      doc.setTextColor(40);
      doc.text('Relatório de Agendamentos - IPDA', 20, 20);
      
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 20, 30);
      
      // Summary stats
      doc.setFontSize(12);
      doc.setTextColor(40);
      doc.text(`Total de Agendamentos: ${stats.total}`, 20, 45);
      doc.text(`Pendentes: ${stats.pendentes} | Confirmados: ${stats.confirmados} | Atendidos: ${stats.atendidos}`, 20, 52);
      doc.text(`Cancelados: ${stats.cancelados} | Não Atendidos: ${stats.naoAtendidos}`, 20, 59);

      console.log('Cabeçalho adicionado');

      // Table data
      const tableData = agendamentos.map(agendamento => {
        try {
          return [
            agendamento.nome || 'N/A',
            agendamento.telefone || 'N/A',
            agendamento.pastor_selecionado || 'N/A',
            agendamento.data_agendamento ? new Date(agendamento.data_agendamento + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A',
            agendamento.horario_agendamento || 'N/A',
            agendamento.status ? agendamento.status.charAt(0).toUpperCase() + agendamento.status.slice(1) : 'N/A'
          ];
        } catch (err) {
          console.error('Erro ao processar agendamento:', agendamento, err);
          return ['Erro', 'Erro', 'Erro', 'Erro', 'Erro', 'Erro'];
        }
      });

      console.log('Dados da tabela preparados:', tableData.length, 'linhas');

      // Aplicar o plugin autoTable ao documento
      autoTable(doc, {
        head: [['Nome', 'Telefone', 'Pastor', 'Data', 'Horário', 'Status']],
        body: tableData,
        startY: 70,
        styles: { 
          fontSize: 8,
          cellPadding: 3,
          textColor: [40],
          lineColor: [200, 200, 200],
          lineWidth: 0.1
        },
        headStyles: { 
          fillColor: [59, 130, 246],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        margin: { left: 20, right: 20 },
        columnStyles: {
          0: { cellWidth: 50 }, // Nome
          1: { cellWidth: 35 }, // Telefone
          2: { cellWidth: 40 }, // Pastor
          3: { cellWidth: 30 }, // Data
          4: { cellWidth: 25 }, // Horário
          5: { cellWidth: 30 }  // Status
        }
      });

      console.log('Tabela adicionada');

      // Footer
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text('IPDA - Sistema de Agendamentos', 20, pageHeight - 10);
      doc.text(`Página 1 de 1`, doc.internal.pageSize.width - 40, pageHeight - 10);

      console.log('Rodapé adicionado');

      const fileName = `relatorio_agendamentos_${new Date().toISOString().split('T')[0]}.pdf`;
      console.log('Salvando arquivo:', fileName);
      
      doc.save(fileName);
      console.log('PDF exportado com sucesso!');
      
    } catch (error) {
      console.error('Erro detalhado ao exportar PDF:', error);
      console.error('Stack trace:', error.stack);
      throw new Error(`Falha na exportação PDF: ${error.message}`);
    }
  };

  const getChartData = () => {
    return [
      { name: 'Pendentes', value: stats.pendentes, color: '#FFA500' },
      { name: 'Confirmados', value: stats.confirmados, color: '#10B981' },
      { name: 'Atendidos', value: stats.atendidos, color: '#3B82F6' },
      { name: 'Cancelados', value: stats.cancelados, color: '#EF4444' },
      { name: 'Não Atendidos', value: stats.naoAtendidos, color: '#8B5CF6' }
    ].filter(item => item.value > 0); // Remove items with 0 values
  };

  const getMonthlyData = () => {
    const monthlyStats: { [key: string]: number } = {};
    
    agendamentos.forEach(agendamento => {
      const date = new Date(agendamento.created_at);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      
      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = 0;
      }
      monthlyStats[monthKey]++;
    });

    return Object.entries(monthlyStats)
      .map(([month, count]) => ({
        month: new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
        agendamentos: count
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  };

  return {
    stats,
    agendamentos,
    loading,
    exportToExcel,
    exportToPDF,
    getChartData,
    getMonthlyData,
    refetch: fetchAllAgendamentos
  };
};
