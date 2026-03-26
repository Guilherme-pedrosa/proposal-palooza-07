import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart } from 'lucide-react';

export default function Relatorios() {
  return (
    <MainLayout>
      <Card className="card-enterprise">
        <CardHeader className="flex flex-row items-center gap-3">
          <BarChart className="h-6 w-6 text-primary" />
          <CardTitle>Relatórios</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Dashboard e relatórios — será implementado no Sprint 08.</p>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
