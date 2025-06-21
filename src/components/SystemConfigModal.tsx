
import React, { useState } from 'react';
import { toast } from 'sonner';

interface SystemConfig {
  horarios: {
    segunda_sexta: string;
    sabado: string;
    domingo: string;
  };
  contatos: {
    telefone: string;
    email: string;
    endereco: string;
  };
  informacoes: {
    antecedencia: string;
    confirmacao: string;
    emergencia: string;
  };
}

interface SystemConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SystemConfig;
  onSave: (config: SystemConfig) => void;
}

const SystemConfigModal: React.FC<SystemConfigModalProps> = ({ isOpen, onClose, config, onSave }) => {
  const [editConfig, setEditConfig] = useState(config);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(editConfig);
    toast.success('Configurações salvas com sucesso!');
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '10px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}>
        <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: 'bold' }}>
          Editar Configurações do Sistema
        </h3>
        
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ fontWeight: 'bold', marginBottom: '10px' }}>Horários de Funcionamento</h4>
          <input
            type="text"
            placeholder="Segunda a Sexta"
            value={editConfig.horarios.segunda_sexta}
            onChange={(e) => setEditConfig({
              ...editConfig,
              horarios: { ...editConfig.horarios, segunda_sexta: e.target.value }
            })}
            style={{ width: '100%', padding: '8px', marginBottom: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          <input
            type="text"
            placeholder="Sábado"
            value={editConfig.horarios.sabado}
            onChange={(e) => setEditConfig({
              ...editConfig,
              horarios: { ...editConfig.horarios, sabado: e.target.value }
            })}
            style={{ width: '100%', padding: '8px', marginBottom: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          <input
            type="text"
            placeholder="Domingo"
            value={editConfig.horarios.domingo}
            onChange={(e) => setEditConfig({
              ...editConfig,
              horarios: { ...editConfig.horarios, domingo: e.target.value }
            })}
            style={{ width: '100%', padding: '8px', marginBottom: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ fontWeight: 'bold', marginBottom: '10px' }}>Contatos da Igreja</h4>
          <input
            type="text"
            placeholder="Telefone"
            value={editConfig.contatos.telefone}
            onChange={(e) => setEditConfig({
              ...editConfig,
              contatos: { ...editConfig.contatos, telefone: e.target.value }
            })}
            style={{ width: '100%', padding: '8px', marginBottom: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          <input
            type="email"
            placeholder="Email"
            value={editConfig.contatos.email}
            onChange={(e) => setEditConfig({
              ...editConfig,
              contatos: { ...editConfig.contatos, email: e.target.value }
            })}
            style={{ width: '100%', padding: '8px', marginBottom: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          <input
            type="text"
            placeholder="Endereço"
            value={editConfig.contatos.endereco}
            onChange={(e) => setEditConfig({
              ...editConfig,
              contatos: { ...editConfig.contatos, endereco: e.target.value }
            })}
            style={{ width: '100%', padding: '8px', marginBottom: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ fontWeight: 'bold', marginBottom: '10px' }}>Informações Importantes</h4>
          <input
            type="text"
            placeholder="Regra de antecedência"
            value={editConfig.informacoes.antecedencia}
            onChange={(e) => setEditConfig({
              ...editConfig,
              informacoes: { ...editConfig.informacoes, antecedencia: e.target.value }
            })}
            style={{ width: '100%', padding: '8px', marginBottom: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          <input
            type="text"
            placeholder="Instruções de confirmação"
            value={editConfig.informacoes.confirmacao}
            onChange={(e) => setEditConfig({
              ...editConfig,
              informacoes: { ...editConfig.informacoes, confirmacao: e.target.value }
            })}
            style={{ width: '100%', padding: '8px', marginBottom: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          <input
            type="text"
            placeholder="Instruções de emergência"
            value={editConfig.informacoes.emergencia}
            onChange={(e) => setEditConfig({
              ...editConfig,
              informacoes: { ...editConfig.informacoes, emergencia: e.target.value }
            })}
            style={{ width: '100%', padding: '8px', marginBottom: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button 
            onClick={onClose}
            style={{
              background: '#f3f4f6',
              color: '#374151',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            style={{
              background: 'linear-gradient(135deg, #10b981, #3b82f6)',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemConfigModal;
