import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { TermCondition, SavedTermCondition } from '@/types/proposal';
import { useProposal } from '@/contexts/ProposalContext';
import { ClipboardList, Plus, X, Edit2, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TermsConditionsFormProps {
  selectedTerms: TermCondition[];
  onChange: (terms: TermCondition[]) => void;
}

export function TermsConditionsForm({ selectedTerms, onChange }: TermsConditionsFormProps) {
  const { savedTerms } = useProposal();
  const [customTerm, setCustomTerm] = useState({ title: '', description: '' });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTermId, setEditingTermId] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState({ title: '', description: '' });

  const isTermSelected = (id: string) => {
    return selectedTerms.some((t) => t.id === id);
  };

  const toggleTerm = (term: SavedTermCondition) => {
    if (isTermSelected(term.id)) {
      onChange(selectedTerms.filter((t) => t.id !== term.id));
    } else {
      onChange([...selectedTerms, { id: crypto.randomUUID(), title: term.title, description: term.description }]);
    }
  };

  const addCustomTerm = () => {
    if (customTerm.title && customTerm.description) {
      const newTerm: TermCondition = {
        id: crypto.randomUUID(),
        title: customTerm.title,
        description: customTerm.description,
      };
      onChange([...selectedTerms, newTerm]);
      setCustomTerm({ title: '', description: '' });
      setIsDialogOpen(false);
    }
  };

  const removeTerm = (id: string) => {
    onChange(selectedTerms.filter((t) => t.id !== id));
  };

  const startEditing = (term: TermCondition) => {
    setEditingTermId(term.id);
    setEditingValues({ title: term.title, description: term.description });
  };

  const saveEditing = () => {
    if (editingTermId) {
      onChange(
        selectedTerms.map((t) =>
          t.id === editingTermId
            ? { ...t, title: editingValues.title, description: editingValues.description }
            : t
        )
      );
      setEditingTermId(null);
      setEditingValues({ title: '', description: '' });
    }
  };

  const cancelEditing = () => {
    setEditingTermId(null);
    setEditingValues({ title: '', description: '' });
  };

  return (
    <Card className="shadow-card animate-fade-in">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="h-5 w-5 text-primary" />
            Termos e Condições
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Personalizado
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Termo Personalizado</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    value={customTerm.title}
                    onChange={(e) => setCustomTerm({ ...customTerm, title: e.target.value })}
                    placeholder="Ex: Condições Especiais"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={customTerm.description}
                    onChange={(e) => setCustomTerm({ ...customTerm, description: e.target.value })}
                    placeholder="Descreva os termos e condições..."
                    rows={4}
                  />
                </div>
                <Button onClick={addCustomTerm} className="w-full">
                  Adicionar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Saved Terms Selection */}
        <div>
          <Label className="mb-3 block text-sm font-medium">Selecionar Termos Cadastrados</Label>
          <ScrollArea className="h-48 rounded-md border p-3">
            <div className="space-y-3">
              {savedTerms.map((term) => (
                <div
                  key={term.id}
                  className="flex items-start gap-3 rounded-lg p-2 hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    id={`term-${term.id}`}
                    checked={isTermSelected(term.id)}
                    onCheckedChange={() => toggleTerm(term)}
                  />
                  <div className="flex-1">
                    <label
                      htmlFor={`term-${term.id}`}
                      className="cursor-pointer text-sm font-medium leading-none"
                    >
                      {term.title}
                    </label>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {term.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Selected Terms - EDITÁVEIS */}
        {selectedTerms.length > 0 && (
          <div>
            <Label className="mb-3 block text-sm font-medium">
              Termos Selecionados ({selectedTerms.length}) - Clique no ícone de edição para modificar
            </Label>
            <div className="space-y-2">
              {selectedTerms.map((term) => (
                <div
                  key={term.id}
                  className="rounded-lg border bg-secondary/30 p-3 animate-scale-in"
                >
                  {editingTermId === term.id ? (
                    <div className="space-y-3">
                      <Input
                        value={editingValues.title}
                        onChange={(e) => setEditingValues({ ...editingValues, title: e.target.value })}
                        placeholder="Título do termo"
                        className="font-medium"
                      />
                      <Textarea
                        value={editingValues.description}
                        onChange={(e) => setEditingValues({ ...editingValues, description: e.target.value })}
                        placeholder="Descrição do termo..."
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveEditing} className="gap-1">
                          <Check className="h-4 w-4" />
                          Salvar
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEditing}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{term.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{term.description}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditing(term)}
                          className="h-7 w-7 p-0 text-primary hover:bg-primary/10"
                          title="Editar termo"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTerm(term.id)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Remover termo"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
