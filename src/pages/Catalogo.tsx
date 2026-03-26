import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UtensilsCrossed } from 'lucide-react';

export default function Catalogo() {
  return (
    <MainLayout>
      <Card className="card-enterprise">
        <CardHeader className="flex flex-row items-center gap-3">
          <UtensilsCrossed className="h-6 w-6 text-primary" />
          <CardTitle>Catálogo de Equipamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Grid de produtos e equipamentos — será implementado no Sprint 03.</p>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
