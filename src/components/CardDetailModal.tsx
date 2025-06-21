
import React from 'react';

interface CardDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardData: {
    title: string;
    value: number;
    icon: string;
    details: string[];
  };
}

const CardDetailModal: React.FC<CardDetailModalProps> = ({ isOpen, onClose, cardData }) => {
  if (!isOpen) return null;

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
        maxWidth: '500px',
        width: '90%',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>{cardData.icon}</div>
          <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>{cardData.title}</h3>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#3b82f6' }}>{cardData.value}</div>
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ fontWeight: 'bold', marginBottom: '10px' }}>Detalhes:</h4>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {cardData.details.map((detail, index) => (
              <li key={index} style={{ 
                padding: '8px 0', 
                borderBottom: '1px solid #f3f4f6',
                color: '#6b7280'
              }}>
                {detail}
              </li>
            ))}
          </ul>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button 
            onClick={onClose}
            style={{
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: 'white',
              border: 'none',
              padding: '10px 30px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CardDetailModal;
