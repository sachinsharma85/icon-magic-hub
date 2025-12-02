import { Camera, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onAddClick: () => void;
}

export const EmptyState = ({ onAddClick }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 animate-fade-in">
      <div className="rounded-full bg-muted p-6 mb-6">
        <Camera className="h-12 w-12 text-muted-foreground" />
      </div>
      <h2 className="text-2xl font-semibold mb-2 text-foreground">No photos yet</h2>
      <p className="text-muted-foreground text-center max-w-sm mb-8">
        Start building your gallery by uploading your first photo
      </p>
      <Button onClick={onAddClick} size="lg" className="gap-2">
        <Plus className="h-5 w-5" />
        Add Your First Photo
      </Button>
    </div>
  );
};
