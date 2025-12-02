import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PhotoCardProps {
  id: string;
  src: string;
  alt: string;
  onDelete: (id: string) => void;
}

export const PhotoCard = ({ id, src, alt, onDelete }: PhotoCardProps) => {
  return (
    <div className="group relative overflow-hidden rounded-xl bg-card shadow-soft transition-smooth hover:shadow-hover animate-scale-in">
      <div className="aspect-square overflow-hidden">
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover transition-smooth group-hover:scale-105"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 transition-smooth group-hover:opacity-100" />
      <Button
        variant="destructive"
        size="icon"
        className="absolute bottom-3 right-3 opacity-0 transition-smooth group-hover:opacity-100 shadow-medium"
        onClick={() => onDelete(id)}
        aria-label="Delete photo"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};
