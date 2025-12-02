import { useState, useEffect, useRef } from "react";
import { Camera, Plus, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhotoCard } from "@/components/PhotoCard";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/hooks/use-toast";

interface Photo {
  id: string;
  src: string;
  alt: string;
  timestamp: number;
}

const Index = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Load photos from localStorage on mount
  useEffect(() => {
    const savedPhotos = localStorage.getItem("gallery-photos");
    if (savedPhotos) {
      try {
        setPhotos(JSON.parse(savedPhotos));
      } catch (error) {
        console.error("Failed to load photos:", error);
      }
    }
  }, []);

  // Save photos to localStorage whenever they change
  useEffect(() => {
    if (photos.length > 0) {
      localStorage.setItem("gallery-photos", JSON.stringify(photos));
    }
  }, [photos]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const newPhoto: Photo = {
            id: `photo-${Date.now()}-${Math.random()}`,
            src: e.target?.result as string,
            alt: file.name,
            timestamp: Date.now(),
          };
          setPhotos((prev) => [newPhoto, ...prev]);
        };
        reader.readAsDataURL(file);
      }
    });

    toast({
      title: "Photos added",
      description: `${files.length} photo(s) uploaded successfully`,
    });

    // Reset input
    if (event.target) {
      event.target.value = "";
    }
  };

  const handleDelete = (id: string) => {
    setPhotos((prev) => prev.filter((photo) => photo.id !== id));
    toast({
      title: "Photo deleted",
      description: "Photo removed from gallery",
    });

    // Update localStorage after deletion
    const updatedPhotos = photos.filter((photo) => photo.id !== id);
    if (updatedPhotos.length === 0) {
      localStorage.removeItem("gallery-photos");
    }
  };

  const handleRefresh = () => {
    const savedPhotos = localStorage.getItem("gallery-photos");
    if (savedPhotos) {
      setPhotos(JSON.parse(savedPhotos));
      toast({
        title: "Gallery refreshed",
        description: "Photos reloaded from storage",
      });
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Home className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">My Gallery</h1>
                <p className="text-sm text-muted-foreground">
                  {photos.length} {photos.length === 1 ? "photo" : "photos"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                title="Refresh gallery"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCameraClick}
                title="Take photo"
                className="hidden sm:flex"
              >
                <Camera className="h-4 w-4" />
              </Button>
              <Button onClick={handleUploadClick} className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Photos</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {photos.length === 0 ? (
          <EmptyState onAddClick={handleUploadClick} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-in">
            {photos.map((photo) => (
              <PhotoCard
                key={photo.id}
                id={photo.id}
                src={photo.src}
                alt={photo.alt}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
};

export default Index;
