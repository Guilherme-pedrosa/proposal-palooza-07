import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';

export default function SyncGC() {
  return (
    <MainLayout>
      <Card className="card-enterprise">
        <CardHeader className="flex flex-row items-center gap-3">
          <RefreshCw className="h-6 w-6 text-primary" />
          <CardTitle>Sincronização GestãoClick</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Status de sync com GestãoClick — será implementado no Sprint 07.</p>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
