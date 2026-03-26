import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useParams } from 'react-router-dom';

export default function CatalogoDetail() {
  const { id } = useParams();
  return (
    <MainLayout>
      <Card className="card-enterprise">
        <CardHeader>
          <CardTitle>Detalhe do Produto</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Produto ID: {id} — será implementado no Sprint 03.</p>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
