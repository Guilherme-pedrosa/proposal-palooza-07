import { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProposalImage } from '@/types/proposal';
import { ImageIcon, Upload, X } from 'lucide-react';

interface ImagesFormProps {
  images: ProposalImage[];
  onChange: (images: ProposalImage[]) => void;
}

export function ImagesForm({ images, onChange }: ImagesFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: ProposalImage[] = [];
    
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newImage: ProposalImage = {
          id: crypto.randomUUID(),
          url: event.target?.result as string,
          name: file.name,
        };
        newImages.push(newImage);
        
        if (newImages.length === files.length) {
          onChange([...images, ...newImages]);
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const removeImage = (id: string) => {
    onChange(images.filter((img) => img.id !== id));
  };

  return (
    <Card className="shadow-card animate-fade-in">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ImageIcon className="h-5 w-5 text-primary" />
            Imagens
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            Adicionar Imagem
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </CardHeader>
      <CardContent>
        {images.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 py-8 cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => inputRef.current?.click()}
          >
            <ImageIcon className="mb-2 h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Clique para adicionar imagens à proposta
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              PNG, JPG ou WEBP
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((image) => (
              <div
                key={image.id}
                className="group relative aspect-video overflow-hidden rounded-lg border bg-muted animate-scale-in"
              >
                <img
                  src={image.url}
                  alt={image.name}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100" />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => removeImage(image.id)}
                  className="absolute right-2 top-2 h-7 w-7 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </Button>
                <p className="absolute bottom-0 left-0 right-0 truncate bg-black/60 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {image.name}
                </p>
              </div>
            ))}
            {/* Add more button */}
            <div
              className="flex aspect-video cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-6 w-6 text-muted-foreground/50" />
              <p className="mt-1 text-xs text-muted-foreground">Adicionar</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
