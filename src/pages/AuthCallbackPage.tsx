import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const { completeOAuthLogin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      navigate('/login?error=Missing+authentication+token', { replace: true });
      return;
    }

    const finish = async () => {
      await completeOAuthLogin(token);
      navigate('/dashboard', { replace: true });
    };
    void finish();
  }, [searchParams, completeOAuthLogin, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F6FA] text-slate-600 dark:bg-[#090D16] dark:text-slate-300">
      <div className="flex items-center gap-2.5 text-sm">
        <Loader2 className="h-5 w-5 animate-spin text-indigo-600 dark:text-indigo-400" />
        <span>Completing Microsoft sign-in...</span>
      </div>
    </div>
  );
}
