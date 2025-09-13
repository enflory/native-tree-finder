import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Ruler, Clock, Leaf } from "lucide-react";
import type { TreeSpecies } from "@shared/schema";

interface TreeSpeciesCardProps {
  species: TreeSpecies;
}

export default function TreeSpeciesCard({ species }: TreeSpeciesCardProps) {
  return (
    <Card className="tree-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg" data-testid={`card-species-${species.id}`}>
      {species.imageUrl && (
        <img
          src={species.imageUrl}
          alt={`${species.commonName} in natural habitat`}
          className="w-full h-48 object-cover rounded-t-lg"
          data-testid={`img-species-${species.id}`}
        />
      )}
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h4 className="text-lg font-semibold text-card-foreground truncate" data-testid={`text-common-name-${species.id}`}>
              {species.commonName}
            </h4>
            <p className="text-sm text-muted-foreground font-mono truncate" data-testid={`text-scientific-name-${species.id}`}>
              {species.scientificName}
            </p>
          </div>
          <Badge variant="secondary" className="ml-2 flex-shrink-0">
            <Leaf className="w-3 h-3 mr-1" />
            Native
          </Badge>
        </div>
        
        <p className="text-sm text-card-foreground mb-4 leading-relaxed line-clamp-3" data-testid={`text-habitat-${species.id}`}>
          {species.habitatDescription}
        </p>
        
        {(species.maxHeight || species.maxAge) && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            {species.maxHeight && (
              <span className="flex items-center">
                <Ruler className="w-3 h-3 mr-1" />
                Up to {species.maxHeight} ft
              </span>
            )}
            {species.maxAge && (
              <span className="flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {species.maxAge}+ years
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
