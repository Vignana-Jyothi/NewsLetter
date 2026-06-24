import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { GoogleLogin } from '@react-oauth/google';
import { Newspaper } from 'lucide-react';

const LoginPage = () => {
  const [error, setError] = useState(null);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  const handleGoogleLogin = async (response) => {
    try {
      setError(null);
      await login(response.credential);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError('Login failed. Please try again or check if the central auth server is running.');
    }
  };

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-6 shadow-lg shadow-primary-600/30">
          <Newspaper size={32} className="text-white" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-2">
          News<span className="text-gradient">Flow</span>
        </h1>
        <p className="text-white/50 text-lg">Department Newsletter Management System</p>
      </div>

      {/* Login Box */}
      <div className="w-full max-w-md bg-surface-900 border border-white/5 rounded-2xl p-8 shadow-xl">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Welcome Back</h2>
        
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleLogin}
            onError={() => setError('Google Login Failed')}
            useOneTap={false}
            theme="filled_black"
            shape="pill"
          />
        </div>
        
        <p className="mt-8 text-white/30 text-xs text-center">
          Powered by vjstartup.com SSO Authentication
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
