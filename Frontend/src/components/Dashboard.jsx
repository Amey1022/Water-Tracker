import { useState, useEffect } from 'react';
import { waterService, statsService, authService } from '../services/api';

function Dashboard({ onLogout }) {
  const [user, setUser] = useState(null);
  const [todayStats, setTodayStats] = useState(null);
  const [intakes, setIntakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customAmount, setCustomAmount] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [userInfo, stats, todayIntakes] = await Promise.all([
        authService.getCurrentUser(),
        statsService.getTodayStats(),
        waterService.getTodayIntakes()
      ]);
      
      setUser(userInfo.data);
      setTodayStats(stats.data);
      setIntakes(todayIntakes.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const addWater = async (amount) => {
    try {
      await waterService.addWater(amount);
      await loadDashboard();
    } catch (error) {
      console.error('Error adding water:', error);
    }
  };

  const addCustomWater = async (e) => {
    e.preventDefault();
    const amount = parseInt(customAmount);
    if (amount > 0) {
      await addWater(amount);
      setCustomAmount('');
    }
  };

  const deleteIntake = async (id) => {
    if (window.confirm('Delete this intake?')) {
      try {
        await waterService.deleteIntake(id);
        await loadDashboard();
      } catch (error) {
        console.error('Error deleting intake:', error);
      }
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '24px', color: '#667eea' }}>Loading...</div>
      </div>
    );
  }

  const percentage = todayStats && user ? Math.min((todayStats.total_intake / user.daily_goal) * 100, 100) : 0;

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
          <div>
            <h1 style={{ fontSize: '28px', marginBottom: '4px' }}>💧 Water Tracker</h1>
            <p style={{ opacity: 0.9 }}>Welcome back, {user?.full_name || 'User'}!</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => window.location.href = '/history'}
              style={{
                padding: '10px 20px',
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              📊 History
            </button>
            <button
              onClick={onLogout}
              style={{
                padding: '10px 20px',
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          
          {/* Left Column - Progress */}
          <div>
            {/* Progress Card */}
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '32px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              marginBottom: '24px'
            }}>
              <h2 style={{ marginBottom: '24px', color: '#1e293b' }}>Today's Progress</h2>
              
              {/* Circular Progress */}
              <div style={{
                width: '200px',
                height: '200px',
                margin: '0 auto 24px',
                position: 'relative'
              }}>
                <svg width="200" height="200" style={{ transform: 'rotate(-90deg)' }}>
                  <circle
                    cx="100"
                    cy="100"
                    r="90"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="12"
                  />
                  <circle
                    cx="100"
                    cy="100"
                    r="90"
                    fill="none"
                    stroke="#667eea"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray="565.48"
                    strokeDashoffset={565.48 - (565.48 * percentage / 100)}
                    style={{ transition: 'stroke-dashoffset 0.5s' }}
                  />
                </svg>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '36px', fontWeight: '700', color: '#1e293b' }}>
                    {todayStats?.total_intake || 0}
                  </div>
                  <div style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
                    of {user?.daily_goal || 2000} ml
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px'
              }}>
                <div style={{
                  background: '#f8fafc',
                  padding: '16px',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#667eea' }}>
                    {Math.round(percentage)}%
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    Complete
                  </div>
                </div>
                <div style={{
                  background: '#f8fafc',
                  padding: '16px',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#667eea' }}>
                    {todayStats?.glasses_count || 0}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    Glasses (250ml)
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Add */}
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ marginBottom: '16px', color: '#1e293b' }}>Quick Add</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                <button
                  onClick={() => addWater(250)}
                  style={{
                    padding: '16px',
                    background: 'white',
                    border: '2px solid #e2e8f0',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#1e293b',
                    transition: 'all 0.3s'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.borderColor = '#667eea';
                    e.target.style.background = '#f8fafc';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.background = 'white';
                  }}
                >
                  250ml<br/>🥤
                </button>
                <button
                  onClick={() => addWater(500)}
                  style={{
                    padding: '16px',
                    background: 'white',
                    border: '2px solid #e2e8f0',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#1e293b',
                    transition: 'all 0.3s'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.borderColor = '#667eea';
                    e.target.style.background = '#f8fafc';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.background = 'white';
                  }}
                >
                  500ml<br/>💧
                </button>
                <button
                  onClick={() => addWater(750)}
                  style={{
                    padding: '16px',
                    background: 'white',
                    border: '2px solid #e2e8f0',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#1e293b',
                    transition: 'all 0.3s'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.borderColor = '#667eea';
                    e.target.style.background = '#f8fafc';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.background = 'white';
                  }}
                >
                  750ml<br/>🍶
                </button>
              </div>

              <form onSubmit={addCustomWater} style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="Custom amount (ml)"
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '16px',
                    outline: 'none'
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: '12px 24px',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '16px'
                  }}
                >
                  Add
                </button>
              </form>
            </div>
          </div>

          {/* Right Column - History */}
          <div>
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ marginBottom: '16px', color: '#1e293b' }}>Today's Intakes</h3>
              
              {intakes.length === 0 ? (
                <p style={{ color: '#64748b', textAlign: 'center', padding: '32px 0' }}>
                  No water intake recorded yet today.<br/>Start tracking your hydration!
                </p>
              ) : (
                <div>
                  {intakes.map((intake) => (
                    <div
                      key={intake.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px',
                        background: '#f8fafc',
                        borderRadius: '12px',
                        marginBottom: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          background: '#dbeafe',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px'
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
                      <button
                        onClick={() => deleteIntake(intake.id)}
                        style={{
                          padding: '8px 12px',
                          background: '#fee2e2',
                          color: '#dc2626',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '600'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
