import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export default function Pipeline() {
  return (
    <MainLayout>
      <Card className="card-enterprise">
        <CardHeader className="flex flex-row items-center gap-3">
          <BarChart3 className="h-6 w-6 text-primary" />
          <CardTitle>Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Kanban de oportunidades — será implementado no Sprint 04.</p>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
