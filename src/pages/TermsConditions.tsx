import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useProposal } from '@/contexts/ProposalContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  ClipboardList, 
  Plus, 
  Edit2, 
  Trash2,
  Save,
  X
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { SavedTermCondition } from '@/types/proposal';

export default function TermsConditions() {
  const { savedTerms, addSavedTerm, updateSavedTerm, deleteSavedTerm } = useProposal();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<SavedTermCondition | null>(null);
  const [formData, setFormData] = useState({ title: '', description: '' });

  const resetForm = () => {
    setFormData({ title: '', description: '' });
    setEditingTerm(null);
  };

  const handleOpenDialog = (term?: SavedTermCondition) => {
    if (term) {
      setEditingTerm(term);
      setFormData({ title: term.title, description: term.description });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleSave = () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('Preencha todos os campos.');
      return;
    }

    if (editingTerm) {
      updateSavedTerm(editingTerm.id, formData);
      toast.success('Termo atualizado com sucesso!');
    } else {
      addSavedTerm({
        id: crypto.randomUUID(),
        ...formData,
      });
      toast.success('Termo adicionado com sucesso!');
    }

    handleCloseDialog();
  };

  const handleDelete = (id: string) => {
    deleteSavedTerm(id);
    toast.success('Termo excluído com sucesso!');
  };

  return (
    <MainLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Termos e Condições</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os termos e condições que podem ser selecionados nas propostas.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 w-full sm:w-auto" onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4" />
              Novo Termo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTerm ? 'Editar Termo' : 'Novo Termo'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Prazo de Validade"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva os termos e condições..."
                  rows={5}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={handleCloseDialog}>
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
                <Button className="flex-1" onClick={handleSave}>
                  <Save className="mr-2 h-4 w-4" />
                  {editingTerm ? 'Atualizar' : 'Salvar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Terms List */}
      {savedTerms.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="mb-4 h-16 w-16 text-muted-foreground/30" />
            <h3 className="mb-2 text-lg font-medium">Nenhum termo cadastrado</h3>
            <p className="mb-4 text-center text-sm text-muted-foreground">
              Adicione termos e condições que podem ser reutilizados em suas propostas.
            </p>
            <Button className="gap-2" onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4" />
              Adicionar Termo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {savedTerms.map((term) => (
            <Card key={term.id} className="shadow-card animate-fade-in">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{term.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                      {term.description}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDialog(term)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir termo?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. O termo "{term.title}" será permanentemente excluído.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(term.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </MainLayout>
  );
}
