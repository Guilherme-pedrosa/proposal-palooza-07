import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays } from 'lucide-react';

export default function Hoje() {
  return (
    <MainLayout>
      <Card className="card-enterprise">
        <CardHeader className="flex flex-row items-center gap-3">
          <CalendarDays className="h-6 w-6 text-primary" />
          <CardTitle>Hoje</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Agenda do vendedor — será implementada no Sprint 05.</p>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
