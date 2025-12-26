import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup' | 'verify'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const mapUser = (user: any) => ({
    id: user.id,
    email: user.email!,
    username: user.user_metadata?.username || user.email!.split('@')[0],
    avatar: user.user_metadata?.avatar_url,
  });

  const handleSendOtp = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });

      if (error) throw error;

      setMode('verify');
      toast({
        title: 'OTP sent',
        description: 'Check your email for the verification code',
      });
    } catch (error: any) {
      toast({
        title: 'Failed to send OTP',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndSetPassword = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
      });

      if (error) throw error;

      const { error: updateError } = await supabase.auth.updateUser({
        password,
        data: { username: username || email.split('@')[0] },
      });

      if (updateError) throw updateError;

      if (data.user) {
        login(mapUser(data.user));
        navigate('/');
      }
    } catch (error: any) {
      toast({
        title: 'Verification failed',
        description: error.message,
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        login(mapUser(data.user));
        navigate('/');
      }
    } catch (error: any) {
      toast({
        title: 'Sign in failed',
        description: error.message,
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-aurora-radial opacity-30" />
      
      <Card className="glass max-w-md w-full p-8 relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-gradient">Aurora.ai</span>
          </h1>
          <p className="text-muted-foreground">
            Legal Intelligence & Cybersecurity Platform
          </p>
        </div>

        {mode === 'signin' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="pl-10 glass"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-10 glass"
                  disabled={loading}
                />
              </div>
            </div>

            <Button
              onClick={handleSignIn}
              disabled={loading || !email || !password}
              className="w-full"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
            </Button>

            <div className="text-center">
              <button
                onClick={() => setMode('signup')}
                className="text-sm text-primary hover:underline"
                disabled={loading}
              >
                Don't have an account? Sign up
              </button>
            </div>
          </div>
        )}

        {mode === 'signup' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="pl-10 glass"
                  disabled={loading}
                />
              </div>
            </div>

            <Button
              onClick={handleSendOtp}
              disabled={loading || !email}
              className="w-full"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Verification Code'}
            </Button>

            <div className="text-center">
              <button
                onClick={() => setMode('signin')}
                className="text-sm text-primary hover:underline"
                disabled={loading}
              >
                Already have an account? Sign in
              </button>
            </div>
          </div>
        )}

        {mode === 'verify' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Verification Code</label>
              <Input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 4-digit code"
                className="glass"
                maxLength={4}
                disabled={loading}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Username (Optional)</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  className="pl-10 glass"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  className="pl-10 glass"
                  disabled={loading}
                />
              </div>
            </div>

            <Button
              onClick={handleVerifyAndSetPassword}
              disabled={loading || !otp || !password}
              className="w-full"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Complete Registration'}
            </Button>

            <div className="text-center">
              <button
                onClick={() => setMode('signup')}
                className="text-sm text-primary hover:underline"
                disabled={loading}
              >
                Resend code
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
