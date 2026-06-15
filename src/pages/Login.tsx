import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Loader2, Lock, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast({ title: 'Erro no login', description: 'E-mail ou senha incorretos.', variant: 'destructive' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Vivid gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-indigo-800 to-purple-900" />

      {/* Decorative blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-20 w-[500px] h-[500px] bg-blue-400/35 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -right-10 w-[450px] h-[450px] bg-purple-500/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-indigo-400/20 rounded-full blur-2xl" />
        <div className="absolute top-0 right-1/4 w-[200px] h-[200px] bg-cyan-400/20 rounded-full blur-2xl" />
      </div>

      <div className="w-full max-w-[400px] relative z-10 animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 shadow-xl shadow-black/20">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white drop-shadow-sm">Auksys IT Tools</h1>
          <p className="text-white/60 mt-1 text-sm">Plataforma de Gestão de TI</p>
        </div>

        {/* Glass card */}
        <div className="bg-white/[0.12] backdrop-blur-2xl border border-white/[0.18] rounded-2xl p-8 shadow-2xl shadow-black/30">
          <div className="mb-6">
            <h2 className="text-base font-semibold text-white">Bem-vindo de volta</h2>
            <p className="text-sm text-white/55 mt-0.5">Faça login para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-white/65">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  id="email" type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="analista@empresa.com"
                  className="pl-10 h-11 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:bg-white/15 focus:border-white/40 transition-colors rounded-xl"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-white/65">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  id="password" type="password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 h-11 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:bg-white/15 focus:border-white/40 transition-colors rounded-xl"
                  required
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-11 mt-1 bg-white text-indigo-700 hover:bg-white/90 font-semibold rounded-xl shadow-lg shadow-black/20 transition-all"
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </div>

        <p className="text-center text-[10px] text-white/30 mt-6 tracking-widest uppercase">
          Auksys IT Tools — Acesso Restrito
        </p>
      </div>
    </div>
  );
}
