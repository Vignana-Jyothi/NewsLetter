import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { GoogleLogin } from '@react-oauth/google';
import { Newspaper, FlaskConical, ChevronRight, Mail } from 'lucide-react';

const IS_DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

const DEV_ACCOUNTS = [
  {
    department: 'CSE',
    color: 'blue',
    users: [
      { email: 'student.cse@newsletter.dev',  role: 'Student' },
      { email: 'faculty.cse@newsletter.dev',  role: 'Faculty' },
      { email: 'admin.cse@newsletter.dev',    role: 'Admin'   },
    ],
  },
  {
    department: 'AIML',
    color: 'violet',
    users: [
      { email: 'student.aiml@newsletter.dev', role: 'Student' },
      { email: 'faculty.aiml@newsletter.dev', role: 'Faculty' },
      { email: 'admin.aiml@newsletter.dev',   role: 'Admin'   },
    ],
  },
];

const ROLE_STYLE = {
  Student: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
  Faculty: 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100',
  Admin:   'bg-primary-50 border-primary-200 text-primary-700 hover:bg-primary-100',
};

const DevPanel = () => {
  const [active, setActive] = useState(null);
  const [error, setError]   = useState('');
  const { devLogin } = useAuth();
  const navigate = useNavigate();

  const handle = async (email) => {
    setActive(email); setError('');
    try {
      await devLogin(email);
      navigate('/dashboard');
    } catch {
      setError('Dev login failed. Is the backend running?');
    } finally { setActive(null); }
  };

  return (
    <div className="w-full max-w-lg">
      <div className="card shadow-card-lg">
        {/* Dev badge */}
        <div className="flex items-center gap-2 mb-5">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-200">
            <FlaskConical size={13} className="text-amber-600" />
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Development Mode</span>
          </div>
        </div>

        <h2 className="text-xl font-bold text-surface-900 mb-1">Select an Account</h2>
        <p className="text-sm text-surface-500 mb-6">Click any account to sign in instantly — no password required.</p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>
        )}

        <div className="space-y-5">
          {DEV_ACCOUNTS.map(({ department, users }) => (
            <div key={department}>
              <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">
                {department} Department
              </p>
              <div className="grid grid-cols-3 gap-2">
                {users.map(({ email, role }) => (
                  <button
                    key={email}
                    onClick={() => handle(email)}
                    disabled={active !== null}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-center
                      transition-all duration-150 active:scale-95
                      disabled:opacity-60 disabled:cursor-wait
                      ${ROLE_STYLE[role]}
                      ${active === email ? 'animate-pulse' : ''}`}
                    title={email}
                  >
                    <div className="w-9 h-9 rounded-full bg-white border border-current/20 flex items-center justify-center font-bold text-sm">
                      {role[0]}
                    </div>
                    <span className="text-xs font-semibold">{role}</span>
                    {active === email && <span className="text-[10px] opacity-70">Signing in…</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-xs text-surface-400 text-center border-t border-surface-100 pt-4">
          Remove <code className="bg-surface-100 px-1 py-0.5 rounded text-surface-600">VITE_DEV_MODE=true</code> to enable production login
        </p>
      </div>
    </div>
  );
};

const ProdPanel = () => {
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleGoogle = async (response) => {
    try { await login(response.credential); navigate('/dashboard'); }
    catch { setError('Login failed. Please try again.'); }
  };

  return (
    <div className="w-full max-w-md">
      <div className="card shadow-card-lg">
        <h2 className="text-xl font-bold text-surface-900 mb-1 text-center">Welcome Back</h2>
        <p className="text-sm text-surface-500 mb-6 text-center">Sign in to your department account</p>
        {error && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm text-center">{error}</div>}
        <div className="flex justify-center">
          <GoogleLogin onSuccess={handleGoogle} onError={() => setError('Google Login Failed')} shape="pill" theme="outline" />
        </div>
        <p className="mt-6 text-xs text-surface-400 text-center">Secured by vjstartup.com SSO</p>
      </div>
    </div>
  );
};

const LoginPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (user) navigate('/dashboard'); }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-lavender-100 flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-primary-600 to-violet-700 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
            <Newspaper size={20} className="text-white" />
          </div>
          <span className="font-bold text-white text-lg">NEWSFLOW</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
            Automated Department<br />Newsletter System
          </h1>
          <p className="text-primary-100 text-lg">
            Submit achievements, manage approvals, and publish beautiful newsletters — all in one place.
          </p>
          <div className="mt-8 space-y-3">
            {['Easy submission workflow', 'Admin approval management', 'Auto-generated PDF newsletters'].map(f => (
              <div key={f} className="flex items-center gap-2 text-primary-100 text-sm">
                <ChevronRight size={16} className="text-primary-300" />
                {f}
              </div>
            ))}
          </div>
        </div>
        <p className="text-primary-300 text-sm">© 2025 NEWSFLOW · vjstartup.com</p>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center shadow-purple">
            <Newspaper size={18} className="text-white" />
          </div>
          <span className="font-bold text-surface-900 text-xl">NEWSFLOW</span>
        </div>

        {IS_DEV_MODE ? <DevPanel /> : <ProdPanel />}
      </div>
    </div>
  );
};

export default LoginPage;
