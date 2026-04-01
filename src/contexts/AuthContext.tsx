import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import type { PerfilUsuario, Usuario } from '@/types/crm';

interface AuthState {
  user: User | null;
  session: Session | null;
  perfil: PerfilUsuario | null;
  usuario: Usuario | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPerfil = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Erro ao buscar perfil:', error);
        return;
      }

      if (data) {
        setUsuario(data as unknown as Usuario);
        setPerfil((data as any).perfil as PerfilUsuario);
      }
    } catch (err) {
      console.error('Erro ao buscar perfil:', err);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          // Use setTimeout to avoid Supabase deadlock
          setTimeout(() => fetchPerfil(currentSession.user.id), 0);
        } else {
          setPerfil(null);
          setUsuario(null);
        }

        setLoading(false);
      }
    );

    // THEN check existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);

      if (existingSession?.user) {
        fetchPerfil(existingSession.user.id);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // Log login
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) {
        await (supabase.from('audit_log' as any) as any).insert({
          usuario_id: u.id,
          tipo: 'login',
          acao: 'Login realizado',
          pagina: '/login',
          user_agent: navigator.userAgent,
        });
      }
    } catch (_) {}
  };

  const signOut = async () => {
    // Log logout before clearing session
    if (user) {
      try {
        await (supabase.from('audit_log' as any) as any).insert({
          usuario_id: user.id,
          tipo: 'logout',
          acao: 'Logout realizado',
          user_agent: navigator.userAgent,
        });
      } catch (_) {}
    }
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setPerfil(null);
    setUsuario(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, perfil, usuario, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
