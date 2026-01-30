import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useProposal } from '@/contexts/ProposalContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  ClipboardList, 
  Plus, 
  Edit2, 
  Trash2,
  Save,
  X,
  Filter
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { SavedTermCondition } from '@/types/proposal';
import { proposalTemplates } from '@/types/proposalTemplate';

const templateOptions = [
  { id: '', name: 'Todos (Gerais)', icon: '📋' },
  ...proposalTemplates.map(t => ({ id: t.id, name: t.name, icon: t.icon })),
];

export default function TermsConditions() {
  const { savedTerms, addSavedTerm, updateSavedTerm, deleteSavedTerm } = useProposal();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<SavedTermCondition | null>(null);
  const [formData, setFormData] = useState({ title: '', description: '', templateIds: [] as string[] });
  const [filterTemplateId, setFilterTemplateId] = useState<string>('all');

  const resetForm = () => {
    setFormData({ title: '', description: '', templateIds: [] });
    setEditingTerm(null);
  };

  const handleOpenDialog = (term?: SavedTermCondition) => {
    if (term) {
      setEditingTerm(term);
      setFormData({ 
        title: term.title, 
        description: term.description,
        templateIds: term.templateIds || []
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const toggleTemplateId = (templateId: string) => {
    setFormData(prev => {
      const newTemplateIds = prev.templateIds.includes(templateId)
        ? prev.templateIds.filter(id => id !== templateId)
        : [...prev.templateIds, templateId];
      return { ...prev, templateIds: newTemplateIds };
    });
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

  const getTemplateLabel = (templateIds: string[]) => {
    if (!templateIds || templateIds.length === 0) {
      return [{ name: 'Todos', color: 'bg-muted text-muted-foreground' }];
    }
    return templateIds.map(id => {
      const template = proposalTemplates.find(t => t.id === id);
      return template 
        ? { name: template.name, color: `bg-[${template.color}]/20 text-[${template.color}]` }
        : { name: id, color: 'bg-muted text-muted-foreground' };
    });
  };

  // Filtrar termos baseado no template selecionado
  const filteredTerms = savedTerms.filter(term => {
    if (filterTemplateId === 'all') return true;
    if (filterTemplateId === 'general') {
      return !term.templateIds || term.templateIds.length === 0;
    }
    return term.templateIds?.includes(filterTemplateId) || (!term.templateIds || term.templateIds.length === 0);
  });

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
          <DialogContent className="max-w-lg">
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
              <div className="space-y-2">
                <Label>Tipos de Proposta (deixe vazio para aparecer em todas)</Label>
                <div className="grid grid-cols-2 gap-2 p-3 rounded-lg border bg-muted/30">
                  {proposalTemplates.map((template) => (
                    <div key={template.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`template-${template.id}`}
                        checked={formData.templateIds.includes(template.id)}
                        onCheckedChange={() => toggleTemplateId(template.id)}
                      />
                      <label 
                        htmlFor={`template-${template.id}`}
                        className="text-sm cursor-pointer flex items-center gap-1"
                      >
                        <span>{template.icon}</span>
                        <span className="truncate">{template.name}</span>
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Se nenhum tipo for selecionado, o termo aparecerá em todas as propostas.
                </p>
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

      {/* Filtro por tipo de proposta */}
      <div className="mb-4 flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Label className="text-sm">Filtrar por tipo:</Label>
        <Select value={filterTemplateId} onValueChange={setFilterTemplateId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todos os tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">📋 Todos os termos</SelectItem>
            <SelectItem value="general">📋 Apenas gerais</SelectItem>
            {proposalTemplates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                {template.icon} {template.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          ({filteredTerms.length} termos)
        </span>
      </div>

      {/* Terms List */}
      {filteredTerms.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="mb-4 h-16 w-16 text-muted-foreground/30" />
            <h3 className="mb-2 text-lg font-medium">Nenhum termo encontrado</h3>
            <p className="mb-4 text-center text-sm text-muted-foreground">
              {filterTemplateId !== 'all' 
                ? 'Não há termos para este tipo de proposta.'
                : 'Adicione termos e condições que podem ser reutilizados em suas propostas.'}
            </p>
            <Button className="gap-2" onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4" />
              Adicionar Termo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredTerms.map((term) => (
            <Card key={term.id} className="shadow-card animate-fade-in">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-foreground">{term.title}</h3>
                      {(!term.templateIds || term.templateIds.length === 0) ? (
                        <Badge variant="secondary" className="text-xs">
                          Todos
                        </Badge>
                      ) : (
                        term.templateIds.map(templateId => {
                          const template = proposalTemplates.find(t => t.id === templateId);
                          return template ? (
                            <Badge 
                              key={templateId} 
                              variant="outline" 
                              className="text-xs"
                              style={{ borderColor: template.color, color: template.color }}
                            >
                              {template.icon} {template.name}
                            </Badge>
                          ) : null;
                        })
                      )}
                    </div>
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
