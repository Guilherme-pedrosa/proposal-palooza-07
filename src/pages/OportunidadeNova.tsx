import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function OportunidadeNova() {
  return (
    <MainLayout>
      <Card className="card-enterprise">
        <CardHeader>
          <CardTitle>Nova Oportunidade</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Formulário de nova oportunidade — será implementado no Sprint 05.</p>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
