import { analyticsService } from './analyticsService';
import { cacheService } from './cacheService';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subWeeks, subMonths, subYears, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Interfaces para tipos de dados
interface AppointmentData {
  id: string;
  name: string;
  email?: string;
  phone: string;
  date: string;
  time: string;
  pastorId: string;
  pastorName: string;
  type: string;
  status: 'agendado' | 'confirmado' | 'cancelado' | 'concluido' | 'faltou';
  duration: number;
  notes?: string;
  priority: 'baixa' | 'normal' | 'alta';
  createdAt: string;
  updatedAt: string;
}

interface PastorData {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialties: string[];
  active: boolean;
  createdAt: string;
}

interface ReportFilter {
  startDate?: string;
  endDate?: string;
  pastorId?: string;
  appointmentType?: string;
  status?: string;
  priority?: string;
}

interface ReportData {
  summary: {
    totalAppointments: number;
    confirmedAppointments: number;
    cancelledAppointments: number;
    completedAppointments: number;
    noShowAppointments: number;
    averageDuration: number;
    mostPopularType: string;
    busyPastor: string;
    conversionRate: number;
  };
  trends: {
    daily: Array<{ date: string; count: number; }>;
    weekly: Array<{ week: string; count: number; }>;
    monthly: Array<{ month: string; count: number; }>;
  };
  pastorStats: Array<{
    pastorId: string;
    pastorName: string;
    totalAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    averageRating?: number;
    specialties: string[];
  }>;
  typeDistribution: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  timeSlotAnalysis: Array<{
    hour: number;
    count: number;
    popularity: number;
  }>;
  satisfactionMetrics: {
    averageRating: number;
    totalRatings: number;
    ratingDistribution: Array<{ rating: number; count: number; }>;
  };
}

interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv' | 'json';
  includeCharts: boolean;
  includeDetails: boolean;
  template?: 'standard' | 'executive' | 'detailed';
}

class ReportService {
  private appointments: AppointmentData[] = [];
  private pastors: PastorData[] = [];
  private lastUpdate: number = 0;
  private cacheTimeout = 5 * 60 * 1000; // 5 minutos

  constructor() {
    this.loadData();
  }

  // Carregar dados
  private async loadData(): Promise<void> {
    try {
      // Carregar agendamentos
      const appointmentsData = cacheService.getCachedAppointments();
      if (appointmentsData) {
        this.appointments = appointmentsData;
      } else {
        // Carregar do localStorage ou API
        const stored = localStorage.getItem('appointments');
        this.appointments = stored ? JSON.parse(stored) : [];
      }

      // Carregar pastores
      const pastorsData = cacheService.getCachedPastors();
      if (pastorsData) {
        this.pastors = pastorsData;
      } else {
        const stored = localStorage.getItem('pastors');
        this.pastors = stored ? JSON.parse(stored) : [];
      }

      this.lastUpdate = Date.now();

    } catch (error) {
      console.error('Erro ao carregar dados para relatórios:', error);
      analyticsService.trackError(error as Error, {
        context: 'report_service_load_data'
      });
    }
  }

  // Verificar se dados precisam ser atualizados
  private async ensureDataFreshness(): Promise<void> {
    if (Date.now() - this.lastUpdate > this.cacheTimeout) {
      await this.loadData();
    }
  }

  // Gerar relatório completo
  async generateReport(filter: ReportFilter = {}): Promise<ReportData> {
    try {
      await this.ensureDataFreshness();

      const filteredAppointments = this.filterAppointments(filter);
      
      const report: ReportData = {
        summary: this.generateSummary(filteredAppointments),
        trends: this.generateTrends(filteredAppointments, filter),
        pastorStats: this.generatePastorStats(filteredAppointments),
        typeDistribution: this.generateTypeDistribution(filteredAppointments),
        timeSlotAnalysis: this.generateTimeSlotAnalysis(filteredAppointments),
        satisfactionMetrics: this.generateSatisfactionMetrics(filteredAppointments)
      };

      analyticsService.trackEvent('report_generated', {
        filterApplied: Object.keys(filter).length > 0,
        appointmentsCount: filteredAppointments.length,
        dateRange: filter.startDate && filter.endDate ? 
          `${filter.startDate} to ${filter.endDate}` : 'all_time'
      });

      return report;

    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      analyticsService.trackError(error as Error, {
        context: 'generate_report',
        filter
      });
      throw error;
    }
  }

  // Filtrar agendamentos
  private filterAppointments(filter: ReportFilter): AppointmentData[] {
    return this.appointments.filter(appointment => {
      // Filtro por data
      if (filter.startDate) {
        const appointmentDate = new Date(appointment.date);
        const startDate = new Date(filter.startDate);
        if (appointmentDate < startDate) return false;
      }

      if (filter.endDate) {
        const appointmentDate = new Date(appointment.date);
        const endDate = new Date(filter.endDate);
        if (appointmentDate > endDate) return false;
      }

      // Filtro por pastor
      if (filter.pastorId && appointment.pastorId !== filter.pastorId) {
        return false;
      }

      // Filtro por tipo
      if (filter.appointmentType && appointment.type !== filter.appointmentType) {
        return false;
      }

      // Filtro por status
      if (filter.status && appointment.status !== filter.status) {
        return false;
      }

      // Filtro por prioridade
      if (filter.priority && appointment.priority !== filter.priority) {
        return false;
      }

      return true;
    });
  }

  // Gerar resumo
  private generateSummary(appointments: AppointmentData[]) {
    const total = appointments.length;
    const confirmed = appointments.filter(a => a.status === 'confirmado').length;
    const cancelled = appointments.filter(a => a.status === 'cancelado').length;
    const completed = appointments.filter(a => a.status === 'concluido').length;
    const noShow = appointments.filter(a => a.status === 'faltou').length;

    const totalDuration = appointments.reduce((sum, a) => sum + a.duration, 0);
    const averageDuration = total > 0 ? totalDuration / total : 0;

    // Tipo mais popular
    const typeCount = appointments.reduce((acc, a) => {
      acc[a.type] = (acc[a.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const mostPopularType = Object.entries(typeCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

    // Pastor mais ocupado
    const pastorCount = appointments.reduce((acc, a) => {
      acc[a.pastorId] = (acc[a.pastorId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const busyPastorId = Object.entries(pastorCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0];
    const busyPastor = this.pastors.find(p => p.id === busyPastorId)?.name || 'N/A';

    // Taxa de conversão (agendados que foram concluídos)
    const conversionRate = total > 0 ? (completed / total) * 100 : 0;

    return {
      totalAppointments: total,
      confirmedAppointments: confirmed,
      cancelledAppointments: cancelled,
      completedAppointments: completed,
      noShowAppointments: noShow,
      averageDuration: Math.round(averageDuration),
      mostPopularType,
      busyPastor,
      conversionRate: Math.round(conversionRate * 100) / 100
    };
  }

  // Gerar tendências
  private generateTrends(appointments: AppointmentData[], filter: ReportFilter) {
    const now = new Date();
    const startDate = filter.startDate ? new Date(filter.startDate) : subMonths(now, 3);
    const endDate = filter.endDate ? new Date(filter.endDate) : now;

    // Tendência diária
    const dailyData = eachDayOfInterval({ start: startDate, end: endDate })
      .map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const count = appointments.filter(a => a.date === dateStr).length;
        return {
          date: format(date, 'dd/MM', { locale: ptBR }),
          count
        };
      });

    // Tendência semanal
    const weeklyData = eachWeekOfInterval({ start: startDate, end: endDate })
      .map(weekStart => {
        const weekEnd = endOfWeek(weekStart);
        const count = appointments.filter(a => {
          const appointmentDate = new Date(a.date);
          return appointmentDate >= weekStart && appointmentDate <= weekEnd;
        }).length;
        return {
          week: format(weekStart, 'dd/MM', { locale: ptBR }),
          count
        };
      });

    // Tendência mensal
    const monthlyData = eachMonthOfInterval({ start: startDate, end: endDate })
      .map(monthStart => {
        const monthEnd = endOfMonth(monthStart);
        const count = appointments.filter(a => {
          const appointmentDate = new Date(a.date);
          return appointmentDate >= monthStart && appointmentDate <= monthEnd;
        }).length;
        return {
          month: format(monthStart, 'MMM/yyyy', { locale: ptBR }),
          count
        };
      });

    return {
      daily: dailyData,
      weekly: weeklyData,
      monthly: monthlyData
    };
  }

  // Gerar estatísticas por pastor
  private generatePastorStats(appointments: AppointmentData[]) {
    const pastorStats = this.pastors.map(pastor => {
      const pastorAppointments = appointments.filter(a => a.pastorId === pastor.id);
      const completed = pastorAppointments.filter(a => a.status === 'concluido').length;
      const cancelled = pastorAppointments.filter(a => a.status === 'cancelado').length;

      return {
        pastorId: pastor.id,
        pastorName: pastor.name,
        totalAppointments: pastorAppointments.length,
        completedAppointments: completed,
        cancelledAppointments: cancelled,
        specialties: pastor.specialties
      };
    });

    return pastorStats.sort((a, b) => b.totalAppointments - a.totalAppointments);
  }

  // Gerar distribuição por tipo
  private generateTypeDistribution(appointments: AppointmentData[]) {
    const typeCount = appointments.reduce((acc, a) => {
      acc[a.type] = (acc[a.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const total = appointments.length;
    
    return Object.entries(typeCount)
      .map(([type, count]) => ({
        type,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100 * 100) / 100 : 0
      }))
      .sort((a, b) => b.count - a.count);
  }

  // Gerar análise de horários
  private generateTimeSlotAnalysis(appointments: AppointmentData[]) {
    const hourCount = appointments.reduce((acc, a) => {
      const hour = parseInt(a.time.split(':')[0]);
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const maxCount = Math.max(...Object.values(hourCount));
    
    return Array.from({ length: 24 }, (_, hour) => {
      const count = hourCount[hour] || 0;
      return {
        hour,
        count,
        popularity: maxCount > 0 ? Math.round((count / maxCount) * 100) : 0
      };
    }).filter(slot => slot.hour >= 8 && slot.hour <= 18); // Horário comercial
  }

  // Gerar métricas de satisfação (placeholder)
  private generateSatisfactionMetrics(appointments: AppointmentData[]) {
    // Em uma implementação real, isso viria de avaliações dos usuários
    const mockRatings = appointments
      .filter(a => a.status === 'concluido')
      .map(() => Math.floor(Math.random() * 5) + 1);

    const totalRatings = mockRatings.length;
    const averageRating = totalRatings > 0 ? 
      mockRatings.reduce((sum, rating) => sum + rating, 0) / totalRatings : 0;

    const ratingDistribution = [1, 2, 3, 4, 5].map(rating => ({
      rating,
      count: mockRatings.filter(r => r === rating).length
    }));

    return {
      averageRating: Math.round(averageRating * 100) / 100,
      totalRatings,
      ratingDistribution
    };
  }

  // Gerar relatório de performance
  async generatePerformanceReport(pastorId?: string): Promise<{
    efficiency: number;
    punctuality: number;
    satisfaction: number;
    workload: number;
    recommendations: string[];
  }> {
    await this.ensureDataFreshness();

    const appointments = pastorId ? 
      this.appointments.filter(a => a.pastorId === pastorId) :
      this.appointments;

    const completed = appointments.filter(a => a.status === 'concluido').length;
    const total = appointments.length;
    const cancelled = appointments.filter(a => a.status === 'cancelado').length;
    const noShow = appointments.filter(a => a.status === 'faltou').length;

    // Métricas calculadas
    const efficiency = total > 0 ? (completed / total) * 100 : 0;
    const punctuality = total > 0 ? ((total - noShow) / total) * 100 : 0;
    const satisfaction = 85 + Math.random() * 10; // Mock
    const workload = appointments.length;

    // Recomendações baseadas nas métricas
    const recommendations: string[] = [];
    
    if (efficiency < 70) {
      recommendations.push('Considere revisar o processo de confirmação de agendamentos');
    }
    if (punctuality < 80) {
      recommendations.push('Implemente lembretes automáticos para reduzir faltas');
    }
    if (cancelled > total * 0.2) {
      recommendations.push('Analise os motivos de cancelamento para melhorar o serviço');
    }
    if (workload > 50) {
      recommendations.push('Considere redistribuir a carga de trabalho');
    }

    return {
      efficiency: Math.round(efficiency),
      punctuality: Math.round(punctuality),
      satisfaction: Math.round(satisfaction),
      workload,
      recommendations
    };
  }

  // Exportar relatório
  async exportReport(reportData: ReportData, options: ExportOptions): Promise<Blob> {
    try {
      analyticsService.trackEvent('report_exported', {
        format: options.format,
        includeCharts: options.includeCharts,
        template: options.template
      });

      switch (options.format) {
        case 'json':
          return this.exportToJSON(reportData);
        case 'csv':
          return this.exportToCSV(reportData);
        case 'excel':
          return this.exportToExcel(reportData);
        case 'pdf':
          return this.exportToPDF(reportData, options);
        default:
          throw new Error('Formato de exportação não suportado');
      }

    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      analyticsService.trackError(error as Error, {
        context: 'export_report',
        format: options.format
      });
      throw error;
    }
  }

  // Exportar para JSON
  private exportToJSON(reportData: ReportData): Blob {
    const jsonString = JSON.stringify(reportData, null, 2);
    return new Blob([jsonString], { type: 'application/json' });
  }

  // Exportar para CSV
  private exportToCSV(reportData: ReportData): Blob {
    let csv = 'Relatório de Agendamentos\n\n';
    
    // Resumo
    csv += 'RESUMO\n';
    csv += `Total de Agendamentos,${reportData.summary.totalAppointments}\n`;
    csv += `Confirmados,${reportData.summary.confirmedAppointments}\n`;
    csv += `Cancelados,${reportData.summary.cancelledAppointments}\n`;
    csv += `Concluídos,${reportData.summary.completedAppointments}\n`;
    csv += `Faltas,${reportData.summary.noShowAppointments}\n`;
    csv += `Duração Média,${reportData.summary.averageDuration} min\n`;
    csv += `Tipo Mais Popular,${reportData.summary.mostPopularType}\n`;
    csv += `Pastor Mais Ocupado,${reportData.summary.busyPastor}\n`;
    csv += `Taxa de Conversão,${reportData.summary.conversionRate}%\n\n`;

    // Estatísticas por Pastor
    csv += 'ESTATÍSTICAS POR PASTOR\n';
    csv += 'Pastor,Total,Concluídos,Cancelados\n';
    reportData.pastorStats.forEach(stat => {
      csv += `${stat.pastorName},${stat.totalAppointments},${stat.completedAppointments},${stat.cancelledAppointments}\n`;
    });

    return new Blob([csv], { type: 'text/csv;charset=utf-8' });
  }

  // Exportar para Excel (simulado)
  private exportToExcel(reportData: ReportData): Blob {
    // Em uma implementação real, usaria uma biblioteca como xlsx
    const csvData = this.exportToCSV(reportData);
    return new Blob([csvData], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
  }

  // Exportar para PDF (simulado)
  private exportToPDF(reportData: ReportData, options: ExportOptions): Blob {
    // Em uma implementação real, usaria uma biblioteca como jsPDF
    let content = `RELATÓRIO DE AGENDAMENTOS\n\n`;
    content += `Data de Geração: ${format(new Date(), 'dd/MM/yyyy HH:mm')}\n\n`;
    
    content += `RESUMO EXECUTIVO\n`;
    content += `Total de Agendamentos: ${reportData.summary.totalAppointments}\n`;
    content += `Taxa de Conversão: ${reportData.summary.conversionRate}%\n`;
    content += `Pastor Mais Ocupado: ${reportData.summary.busyPastor}\n\n`;
    
    if (options.includeDetails) {
      content += `DETALHES COMPLETOS\n`;
      content += JSON.stringify(reportData, null, 2);
    }

    return new Blob([content], { type: 'application/pdf' });
  }

  // Gerar relatório de tendências
  async generateTrendReport(period: 'week' | 'month' | 'quarter' | 'year'): Promise<{
    currentPeriod: any;
    previousPeriod: any;
    growth: number;
    insights: string[];
  }> {
    await this.ensureDataFreshness();

    const now = new Date();
    let currentStart: Date, currentEnd: Date, previousStart: Date, previousEnd: Date;

    switch (period) {
      case 'week':
        currentStart = startOfWeek(now);
        currentEnd = endOfWeek(now);
        previousStart = startOfWeek(subWeeks(now, 1));
        previousEnd = endOfWeek(subWeeks(now, 1));
        break;
      case 'month':
        currentStart = startOfMonth(now);
        currentEnd = endOfMonth(now);
        previousStart = startOfMonth(subMonths(now, 1));
        previousEnd = endOfMonth(subMonths(now, 1));
        break;
      case 'quarter':
        currentStart = startOfMonth(subMonths(now, 2));
        currentEnd = endOfMonth(now);
        previousStart = startOfMonth(subMonths(now, 5));
        previousEnd = endOfMonth(subMonths(now, 3));
        break;
      case 'year':
        currentStart = startOfYear(now);
        currentEnd = endOfYear(now);
        previousStart = startOfYear(subYears(now, 1));
        previousEnd = endOfYear(subYears(now, 1));
        break;
    }

    const currentData = await this.generateReport({
      startDate: format(currentStart, 'yyyy-MM-dd'),
      endDate: format(currentEnd, 'yyyy-MM-dd')
    });

    const previousData = await this.generateReport({
      startDate: format(previousStart, 'yyyy-MM-dd'),
      endDate: format(previousEnd, 'yyyy-MM-dd')
    });

    const growth = previousData.summary.totalAppointments > 0 ?
      ((currentData.summary.totalAppointments - previousData.summary.totalAppointments) / 
       previousData.summary.totalAppointments) * 100 : 0;

    const insights: string[] = [];
    
    if (growth > 10) {
      insights.push(`Crescimento significativo de ${Math.round(growth)}% nos agendamentos`);
    } else if (growth < -10) {
      insights.push(`Redução de ${Math.round(Math.abs(growth))}% nos agendamentos`);
    }

    if (currentData.summary.conversionRate > previousData.summary.conversionRate) {
      insights.push('Melhoria na taxa de conversão');
    }

    return {
      currentPeriod: currentData,
      previousPeriod: previousData,
      growth: Math.round(growth * 100) / 100,
      insights
    };
  }

  // Limpar cache
  clearCache(): void {
    this.lastUpdate = 0;
  }
}

// Instância global
export const reportService = new ReportService();

// Hook para React
export const useReports = () => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const generateReport = async (filter: ReportFilter = {}) => {
    setLoading(true);
    setError(null);
    try {
      const report = await reportService.generateReport(filter);
      return report;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (reportData: ReportData, options: ExportOptions) => {
    setLoading(true);
    setError(null);
    try {
      const blob = await reportService.exportReport(reportData, options);
      
      // Download do arquivo
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio-${format(new Date(), 'yyyy-MM-dd-HHmm')}.${options.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      return blob;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const generatePerformanceReport = async (pastorId?: string) => {
    setLoading(true);
    setError(null);
    try {
      return await reportService.generatePerformanceReport(pastorId);
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const generateTrendReport = async (period: 'week' | 'month' | 'quarter' | 'year') => {
    setLoading(true);
    setError(null);
    try {
      return await reportService.generateTrendReport(period);
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    generateReport,
    exportReport,
    generatePerformanceReport,
    generateTrendReport,
    clearCache: reportService.clearCache.bind(reportService)
  };
};

export default reportService;