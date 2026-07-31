import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:5001/api/auth/login', {
        phone_number: phone,
        password: password
      });

      localStorage.setItem('dms_token', response.data.token);
      localStorage.setItem('dms_user', JSON.stringify(response.data.user));

      if (response.data.user.role === 'SD_ADMIN') {
        navigate('/admin/dashboard');
      } else {
        navigate('/distributor/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header" style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img src="/logo.png" alt="Anand DMS" style={{ height: '90px', objectFit: 'contain', marginBottom: '12px' }} />
          <p>Sign in to your distribution account</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>Phone Number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter your phone number"
              required
              disabled={isLoading}
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={isLoading}
            />
          </div>

          <button type="submit" className="login-btn" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
