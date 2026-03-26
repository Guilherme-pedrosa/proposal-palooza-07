import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export default function PropostaPublica() {
  const { uuid } = useParams();
  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <Card className="max-w-lg w-full card-enterprise">
        <CardHeader className="flex flex-row items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <CardTitle>Proposta</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Link público da proposta ({uuid}) — será implementado no Sprint 06.</p>
        </CardContent>
      </Card>
    </div>
  );
}
