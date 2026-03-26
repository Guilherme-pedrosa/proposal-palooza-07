import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useParams } from 'react-router-dom';

export default function OportunidadeDetail() {
  const { id } = useParams();
  return (
    <MainLayout>
      <Card className="card-enterprise">
        <CardHeader>
          <CardTitle>Detalhe da Oportunidade</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Oportunidade ID: {id} — será implementada no Sprint 05.</p>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
