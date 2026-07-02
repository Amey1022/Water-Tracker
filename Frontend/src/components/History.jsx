import { useState, useEffect } from 'react';
import { waterService } from '../services/api';

function History({ onBack }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    loadHistory();
  }, [days]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const intakes = await waterService.getHistory(days);
      
      // Group by date
      const grouped = {};
      intakes.data.forEach(intake => {
        const date = intake.date;
        if (!grouped[date]) {
          grouped[date] = [];
        }
        grouped[date].push(intake);
      });
      
      setHistory(grouped);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    }
  };

  const getDayTotal = (intakes) => {
    return intakes.reduce((sum, intake) => sum + intake.amount, 0);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '24px', color: '#667eea' }}>Loading history...</div>
      </div>
    );
  }

  const dates = Object.keys(history).sort((a, b) => new Date(b) - new Date(a));

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '24px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={onBack}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                padding: '8px 16px',
                fontSize: '20px'
              }}
            >
              ← Back
            </button>
            <h1 style={{ fontSize: '28px', margin: 0 }}>📊 History</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        
        {/* Filter Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          marginBottom: '24px',
          background: 'white',
          padding: '16px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          {[7, 14, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              style={{
                padding: '10px 20px',
                background: days === d ? '#667eea' : 'white',
                color: days === d ? 'white' : '#64748b',
                border: days === d ? 'none' : '2px solid #e2e8f0',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Last {d} days
            </button>
          ))}
        </div>

        {/* Summary Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#667eea' }}>
              {dates.length}
            </div>
            <div style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
              Days Tracked
            </div>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#10b981' }}>
              {Object.values(history).reduce((sum, intakes) => sum + intakes.length, 0)}
            </div>
            <div style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
              Total Intakes
            </div>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#f59e0b' }}>
              {Math.round(Object.values(history).reduce((sum, intakes) => sum + getDayTotal(intakes), 0) / dates.length || 0)}
            </div>
            <div style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
              Avg Daily (ml)
            </div>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#ec4899' }}>
              {Object.values(history).reduce((sum, intakes) => sum + getDayTotal(intakes), 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
              Total (ml)
            </div>
          </div>
        </div>

        {/* History by Date */}
        {dates.length === 0 ? (
          <div style={{
            background: 'white',
            padding: '48px',
            borderRadius: '12px',
            textAlign: 'center',
            color: '#64748b'
          }}>
            No history found for the selected period.
          </div>
        ) : (
          dates.map(date => {
            const dayIntakes = history[date];
            const dayTotal = getDayTotal(dayIntakes);
            
            return (
              <div
                key={date}
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '24px',
                  marginBottom: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                {/* Date Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                  paddingBottom: '16px',
                  borderBottom: '2px solid #f1f5f9'
                }}>
                  <div>
                    <h3 style={{ fontSize: '20px', color: '#1e293b', marginBottom: '4px' }}>
                      {formatDate(date)}
                    </h3>
                    <p style={{ fontSize: '14px', color: '#64748b' }}>
                      {new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#667eea' }}>
                      {dayTotal} ml
                    </div>
                    <div style={{ fontSize: '14px', color: '#64748b' }}>
                      {dayIntakes.length} intake{dayIntakes.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                {/* Intakes List */}
                <div style={{ display: 'grid', gap: '8px' }}>
                  {dayIntakes.sort((a, b) => new Date(b.intake_time) - new Date(a.intake_time)).map(intake => (
                    <div
                      key={intake.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        background: '#f8fafc',
                        borderRadius: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          background: '#dbeafe',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '18px'
                        }}>
                          💧
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', color: '#1e293b' }}>
                            {intake.amount} ml
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            {new Date(intake.intake_time).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Day Progress Bar */}
                <div style={{ marginTop: '16px' }}>
                  <div style={{
                    height: '8px',
                    background: '#e2e8f0',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      background: dayTotal >= 2000 ? '#10b981' : '#667eea',
                      width: `${Math.min((dayTotal / 2000) * 100, 100)}%`,
                      transition: 'width 0.3s'
                    }} />
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '8px',
                    fontSize: '12px',
                    color: '#64748b'
                  }}>
                    <span>{Math.round((dayTotal / 2000) * 100)}% of daily goal</span>
                    <span>{dayTotal >= 2000 ? '✅ Goal achieved!' : `${2000 - dayTotal} ml remaining`}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default History;
