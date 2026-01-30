import { ProposalTemplate, proposalTemplates } from '@/types/proposalTemplate';
import { Card, CardContent } from '@/components/ui/card';
import { Check } from 'lucide-react';

interface TemplateSelectorProps {
  selectedTemplate: ProposalTemplate | null;
  onSelect: (template: ProposalTemplate) => void;
}

export function TemplateSelector({ selectedTemplate, onSelect }: TemplateSelectorProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">Selecione o modelo de proposta</h2>
        <p className="text-muted-foreground mt-2">
          Cada modelo tem seções específicas para o tipo de serviço
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {proposalTemplates.map((template) => {
          const isSelected = selectedTemplate?.id === template.id;
          
          return (
            <Card
              key={template.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                isSelected 
                  ? 'ring-2 ring-offset-2 ring-primary' 
                  : 'hover:border-primary/50'
              }`}
              style={{ 
                borderColor: isSelected ? template.color : undefined,
              }}
              onClick={() => onSelect(template)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{template.icon}</span>
                    <div>
                      <h3 className="font-semibold text-lg text-foreground">{template.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                    </div>
                  </div>
                  {isSelected && (
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: template.color }}
                    >
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Seções incluídas:</p>
                  <div className="flex flex-wrap gap-2">
                    {template.sections.map((section) => (
                      <span
                        key={section.id}
                        className="text-xs px-2 py-1 rounded-full"
                        style={{ 
                          backgroundColor: `${template.color}20`,
                          color: template.color,
                        }}
                      >
                        {section.name}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
