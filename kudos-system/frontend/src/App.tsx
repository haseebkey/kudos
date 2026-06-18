import { useState, useEffect } from 'react';

interface KudosItem {
  kudos_id: string;
  sender_id: string;
  sender_name: string;
  recipient_id: string;
  recipient_name: string;
  message: string;
  category: string;
  tags?: string[];
  created_at: string;
}

interface Colleague {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  department: string;
}

function App() {
  const [kudos, setKudos] = useState<KudosItem[]>([]);
  const [colleagues, setColleagues] = useState<Colleague[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    recipient_id: '',
    message: '',
    is_anonymous: false,
    category: 'General',
  });

  // Helper function to format dates safely
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Unknown date';
      }
      const dateStr = date.toLocaleDateString();
      const timeStr = date.toLocaleTimeString();
      return `${dateStr} ${timeStr}`;
    } catch {
      return 'Unknown date';
    }
  };

  // Fetch kudos feed on mount
  useEffect(() => {
    fetchKudosFeed();
  }, []);

  // Fetch colleagues when modal opens
  useEffect(() => {
    if (showModal) {
      fetchColleagues();
    }
  }, [showModal]);

  const fetchKudosFeed = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:3000/api/v1/kudos/feed', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch kudos');
      const data = await response.json();
      setKudos(data.data || []);
    } catch (err: any) {
      console.error('Error fetching kudos:', err);
      setError('Could not connect to the API. Make sure the backend is running on http://localhost:3000');
      setKudos([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchColleagues = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/v1/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch colleagues');
      const data = await response.json();
      setColleagues(data || []);
    } catch (err: any) {
      console.error('Error fetching colleagues:', err);
      setError('Could not load colleagues. Make sure the backend is running.');
      setColleagues([]);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.currentTarget;
    if (type === 'checkbox') {
      setFormData((prev) => ({
        ...prev,
        [name]: (e.currentTarget as HTMLInputElement).checked,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmitKudos = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.recipient_id || !formData.message.trim()) {
      setError('Recipient and message are required');
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/v1/kudos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`,
        },
        body: JSON.stringify({
          recipientId: formData.recipient_id,
          message: formData.message,
        }),
      });

      if (!response.ok) throw new Error('Failed to create kudos');

      setFormData({
        recipient_id: '',
        message: '',
        is_anonymous: false,
        category: 'General',
      });
      setShowModal(false);
      fetchKudosFeed();
    } catch (err: any) {
      console.error('Error creating kudos:', err);
      setError('Failed to create kudos. Make sure the backend is running and you are authenticated.');
    }
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    borderBottom: '3px solid #007bff',
    paddingBottom: '20px',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '32px',
    fontWeight: 'bold',
    margin: 0,
    color: '#333',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
  };

  const feedStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px',
    marginBottom: '30px',
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '16px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  };

  const cardHeaderStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px',
    fontSize: '14px',
    color: '#666',
  };

  const senderStyle: React.CSSProperties = {
    fontWeight: 'bold',
    color: '#333',
  };

  const recipientStyle: React.CSSProperties = {
    fontWeight: 'bold',
    color: '#007bff',
  };

  const messageStyle: React.CSSProperties = {
    fontSize: '16px',
    lineHeight: '1.5',
    margin: '10px 0',
    color: '#333',
  };

  const categoryStyle: React.CSSProperties = {
    display: 'inline-block',
    backgroundColor: '#e7f3ff',
    color: '#007bff',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    marginTop: '10px',
  };

  const timestampStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#999',
    marginTop: '8px',
  };

  const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  };

  const modalStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    maxWidth: '500px',
    width: '90%',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
  };

  const modalHeaderStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '16px',
    color: '#333',
  };

  const formGroupStyle: React.CSSProperties = {
    marginBottom: '16px',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '6px',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box',
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: '120px',
    fontFamily: 'Arial, sans-serif',
    resize: 'vertical',
  };

  const modalActionsStyle: React.CSSProperties = {
    display: 'flex',
    gap: '10px',
    marginTop: '20px',
  };

  const cancelButtonStyle: React.CSSProperties = {
    flex: 1,
    padding: '10px',
    backgroundColor: '#e0e0e0',
    color: '#333',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
  };

  const submitButtonStyle: React.CSSProperties = {
    flex: 1,
    padding: '10px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
  };

  const errorStyle: React.CSSProperties = {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    padding: '12px',
    borderRadius: '4px',
    marginBottom: '16px',
    fontSize: '14px',
  };

  const emptyStateStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '40px',
    color: '#999',
    fontSize: '16px',
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>Kudos Dashboard</h1>
        <button style={buttonStyle} onClick={() => setShowModal(true)}>
          Give Kudos
        </button>
      </div>

      {error && <div style={errorStyle}>{error}</div>}

      {loading && <div style={emptyStateStyle}>Loading kudos...</div>}

      {!loading && kudos.length === 0 && (
        <div style={emptyStateStyle}>No kudos yet. Be the first to give one!</div>
      )}

      {!loading && kudos.length > 0 && (
        <div style={feedStyle}>
          {kudos.map((k) => (
            <div key={k.kudos_id} style={cardStyle}>
              <div style={cardHeaderStyle}>
                <span style={senderStyle}>{k.sender_name}</span>
                <span>→</span>
                <span style={recipientStyle}>{k.recipient_name}</span>
              </div>
              <div style={messageStyle}>{k.message}</div>
              <div>
                <span style={categoryStyle}>{k.category}</span>
              </div>
              <div style={timestampStyle}>
                {formatDate(k.created_at)}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div style={modalOverlayStyle} onClick={() => setShowModal(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeaderStyle}>Give Kudos</div>

            {error && <div style={errorStyle}>{error}</div>}

            <form onSubmit={handleSubmitKudos}>
              <div style={formGroupStyle}>
                <label htmlFor="recipient" style={labelStyle}>
                  Recipient *
                </label>
                <select
                  id="recipient"
                  name="recipient_id"
                  value={formData.recipient_id}
                  onChange={handleFormChange}
                  style={inputStyle}
                  required
                >
                  <option value="">Select a colleague</option>
                  {colleagues.map((c) => (
                    <option key={c.user_id} value={c.user_id}>
                      {c.first_name} {c.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={formGroupStyle}>
                <label htmlFor="category" style={labelStyle}>
                  Category
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleFormChange}
                  style={inputStyle}
                >
                  <option value="General">General</option>
                  <option value="Leadership">Leadership</option>
                  <option value="Collaboration">Collaboration</option>
                  <option value="Innovation">Innovation</option>
                  <option value="Excellence">Excellence</option>
                  <option value="Support">Support</option>
                </select>
              </div>

              <div style={formGroupStyle}>
                <label htmlFor="message" style={labelStyle}>
                  Message * (max 500 characters)
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleFormChange}
                  placeholder="Share your appreciation..."
                  style={textareaStyle}
                  maxLength={500}
                  required
                />
                <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                  {formData.message.length}/500
                </div>
              </div>

              <div style={modalActionsStyle}>
                <button
                  type="button"
                  style={cancelButtonStyle}
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" style={submitButtonStyle}>
                  Send Kudos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
