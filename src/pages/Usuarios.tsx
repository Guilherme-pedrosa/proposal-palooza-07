import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Users, UserPlus, Mail, Phone, Shield, ShieldCheck, ShieldAlert,
  Loader2, MoreHorizontal, Pencil, Power,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { PerfilUsuario } from '@/types/crm';

const perfilLabels: Record<PerfilUsuario, { label: string; icon: React.ReactNode; color: string }> = {
  admin: { label: 'Admin', icon: <ShieldAlert className="h-3.5 w-3.5" />, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  gestor: { label: 'Gestor', icon: <ShieldCheck className="h-3.5 w-3.5" />, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  vendedor: { label: 'Vendedor', icon: <Shield className="h-3.5 w-3.5" />, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
};

interface NovoUsuario {
  nome: string;
  email: string;
  telefone: string;
  perfil: PerfilUsuario;
  senha: string;
}

const defaultNovoUsuario: NovoUsuario = {
  nome: '',
  email: '',
  telefone: '',
  perfil: 'vendedor',
  senha: '',
};

export default function Usuarios() {
  const { perfil: meuPerfil, user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [novoUsuario, setNovoUsuario] = useState<NovoUsuario>(defaultNovoUsuario);
  const [editUsuario, setEditUsuario] = useState<{ id: string; nome: string; telefone: string; perfil: PerfilUsuario } | null>(null);
  const [saving, setSaving] = useState(false);

  const isAdmin = meuPerfil === 'admin' || meuPerfil === 'gestor';

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['usuarios_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .order('nome');
      if (error) throw error;
      return data as any[];
    },
  });

  const handleCriarUsuario = async () => {
    if (!novoUsuario.nome.trim() || !novoUsuario.email.trim() || !novoUsuario.senha.trim()) {
      toast.error('Preencha nome, e-mail e senha.');
      return;
    }
    if (novoUsuario.senha.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setSaving(true);
    try {
      // Create auth user via edge function
      const { data, error } = await supabase.functions.invoke('criar-usuario', {
        body: {
          email: novoUsuario.email.trim(),
          password: novoUsuario.senha,
          nome: novoUsuario.nome.trim(),
          perfil: novoUsuario.perfil,
          telefone: novoUsuario.telefone.trim() || null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Usuário ${novoUsuario.nome} criado com sucesso!`);
      setDialogOpen(false);
      setNovoUsuario(defaultNovoUsuario);
      queryClient.invalidateQueries({ queryKey: ['usuarios_list'] });
    } catch (e: any) {
      toast.error(`Erro ao criar usuário: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEditarUsuario = async () => {
    if (!editUsuario) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({
          nome: editUsuario.nome,
          telefone: editUsuario.telefone || null,
          perfil: editUsuario.perfil,
        })
        .eq('id', editUsuario.id);
      if (error) throw error;
      toast.success('Usuário atualizado!');
      setEditDialogOpen(false);
      setEditUsuario(null);
      queryClient.invalidateQueries({ queryKey: ['usuarios_list'] });
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAtivo = async (id: string, ativo: boolean) => {
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ ativo: !ativo })
        .eq('id', id);
      if (error) throw error;
      toast.success(ativo ? 'Usuário desativado' : 'Usuário reativado');
      queryClient.invalidateQueries({ queryKey: ['usuarios_list'] });
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
    }
  };

  return (
    <MainLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os usuários do sistema.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setDialogOpen(true)} className="gap-2 w-full sm:w-auto">
            <UserPlus className="h-4 w-4" />
            Novo Usuário
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {usuarios.map((u: any) => {
            const pCfg = perfilLabels[u.perfil as PerfilUsuario] || perfilLabels.vendedor;
            const initials = u.nome?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || '??';
            const isMe = u.id === user?.id;
            return (
              <Card key={u.id} className={`shadow-card transition-all ${!u.ativo ? 'opacity-60' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-10 w-10 shrink-0">
                        {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm truncate">{u.nome}</p>
                          {isMe && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Você</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                    </div>
                    {isAdmin && !isMe && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setEditUsuario({ id: u.id, nome: u.nome, telefone: u.telefone || '', perfil: u.perfil });
                            setEditDialogOpen(true);
                          }}>
                            <Pencil className="h-4 w-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleAtivo(u.id, u.ativo)}>
                            <Power className="h-4 w-4 mr-2" /> {u.ativo ? 'Desativar' : 'Reativar'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={`text-[11px] gap-1 ${pCfg.color}`}>
                      {pCfg.icon} {pCfg.label}
                    </Badge>
                    {!u.ativo && <Badge variant="destructive" className="text-[10px]">Inativo</Badge>}
                  </div>
                  {u.telefone && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {u.telefone}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog: Novo Usuário */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Novo Usuário
            </DialogTitle>
            <DialogDescription>
              Crie um novo acesso ao sistema. O usuário receberá as credenciais por e-mail.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={novoUsuario.nome}
                onChange={e => setNovoUsuario(p => ({ ...p, nome: e.target.value }))}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail *</Label>
              <Input
                type="email"
                value={novoUsuario.email}
                onChange={e => setNovoUsuario(p => ({ ...p, email: e.target.value }))}
                placeholder="email@empresa.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Senha *</Label>
              <Input
                type="password"
                value={novoUsuario.senha}
                onChange={e => setNovoUsuario(p => ({ ...p, senha: e.target.value }))}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={novoUsuario.telefone}
                  onChange={e => setNovoUsuario(p => ({ ...p, telefone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="space-y-2">
                <Label>Perfil *</Label>
                <Select value={novoUsuario.perfil} onValueChange={v => setNovoUsuario(p => ({ ...p, perfil: v as PerfilUsuario }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vendedor">Vendedor</SelectItem>
                    <SelectItem value="gestor">Gestor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCriarUsuario} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Criando...</> : 'Criar Usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Usuário */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Editar Usuário
            </DialogTitle>
            <DialogDescription>Altere os dados do usuário.</DialogDescription>
          </DialogHeader>
          {editUsuario && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={editUsuario.nome}
                  onChange={e => setEditUsuario(p => p ? { ...p, nome: e.target.value } : p)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={editUsuario.telefone}
                    onChange={e => setEditUsuario(p => p ? { ...p, telefone: e.target.value } : p)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Perfil</Label>
                  <Select value={editUsuario.perfil} onValueChange={v => setEditUsuario(p => p ? { ...p, perfil: v as PerfilUsuario } : p)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vendedor">Vendedor</SelectItem>
                      <SelectItem value="gestor">Gestor</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditarUsuario} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}