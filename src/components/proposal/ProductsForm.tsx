import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Product } from '@/types/proposal';
import { Package, Plus, Trash2 } from 'lucide-react';

interface ProductsFormProps {
  products: Product[];
  onChange: (products: Product[]) => void;
}

export function ProductsForm({ products, onChange }: ProductsFormProps) {
  const addProduct = () => {
    const newProduct: Product = {
      id: crypto.randomUUID(),
      name: '',
      description: '',
      unit: 'UN',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      discount: 0,
      discountNote: '',
    };
    onChange([...products, newProduct]);
  };

  const updateProduct = (id: string, field: keyof Product, value: string | number) => {
    onChange(
      products.map((p) => {
        if (p.id === id) {
          const updated = { ...p, [field]: value };
          // Recalculate total when quantity, unit price or discount changes
          if (field === 'quantity' || field === 'unitPrice' || field === 'discount') {
            const subtotal = updated.quantity * updated.unitPrice;
            const discountValue = updated.discount || 0;
            updated.totalPrice = subtotal - discountValue;
          }
          return updated;
        }
        return p;
      })
    );
  };

  const removeProduct = (id: string) => {
    onChange(products.filter((p) => p.id !== id));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const totalValue = products.reduce((sum, p) => sum + p.totalPrice, 0);

  return (
    <Card className="shadow-card animate-fade-in">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5 text-primary" />
            Produtos / Serviços
          </CardTitle>
          <Button onClick={addProduct} size="sm" variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Adicionar Item
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Package className="mb-2 h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Nenhum produto adicionado. Clique em "Adicionar Item" para começar.
            </p>
          </div>
        ) : (
          <>
            {products.map((product, index) => (
              <div
                key={product.id}
                className="rounded-lg border bg-muted/30 p-4 animate-scale-in"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Item {index + 1}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeProduct(product.id)}
                    className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Nome do Produto/Serviço</Label>
                    <Input
                      value={product.name}
                      onChange={(e) => updateProduct(product.id, 'name', e.target.value)}
                      placeholder="Ex: Manutenção Preventiva"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unidade</Label>
                    <Input
                      value={product.unit}
                      onChange={(e) => updateProduct(product.id, 'unit', e.target.value)}
                      placeholder="UN, SV, HR"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantidade</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={product.quantity}
                      onChange={(e) =>
                        updateProduct(product.id, 'quantity', parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2 lg:col-span-4">
                    <Label>Descrição</Label>
                    <Textarea
                      value={product.description}
                      onChange={(e) => updateProduct(product.id, 'description', e.target.value)}
                      placeholder="Descrição detalhada do produto ou serviço..."
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor Unitário</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={product.unitPrice}
                      onChange={(e) =>
                        updateProduct(product.id, 'unitPrice', parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Desconto (R$)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={product.discount || 0}
                      onChange={(e) =>
                        updateProduct(product.id, 'discount', parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor Total</Label>
                    <div className="flex h-10 items-center rounded-md bg-secondary px-3 text-sm font-medium text-secondary-foreground">
                      {formatCurrency(product.totalPrice)}
                    </div>
                  </div>
                  <div className="space-y-2 sm:col-span-2 lg:col-span-4">
                    <Label>Observação do Desconto</Label>
                    <Input
                      value={product.discountNote || ''}
                      onChange={(e) => updateProduct(product.id, 'discountNote', e.target.value)}
                      placeholder="Ex: Desconto promocional, cliente fidelidade..."
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Total */}
            <div className="flex items-center justify-end border-t pt-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Valor Total da Proposta</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(totalValue)}
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
