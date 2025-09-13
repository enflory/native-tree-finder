import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/header";
import Footer from "@/components/footer";
import TreeSearchForm from "@/components/tree-search-form";
import TreeSpeciesCard from "@/components/tree-species-card";
import { Card } from "@/components/ui/card";
import { Loader2, AlertTriangle, Sprout, Droplets, Shield } from "lucide-react";
import type { TreeSpecies } from "@shared/schema";

interface SearchResults {
  species: TreeSpecies[];
  location: string;
  count: number;
}

export default function Home() {
  const [searchParams, setSearchParams] = useState<{ city: string; state: string } | null>(null);

  const {
    data: results,
    isLoading,
    error,
    refetch
  } = useQuery<SearchResults>({
    queryKey: ["/api/tree-species/search", searchParams],
    enabled: !!searchParams,
    queryFn: async () => {
      if (!searchParams) throw new Error("No search parameters");
      
      const response = await fetch("/api/tree-species/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(searchParams),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch tree species");
      }
      
      return response.json();
    },
  });

  const handleSearch = (city: string, state: string) => {
    setSearchParams({ city, state });
  };

  const handleRetry = () => {
    refetch();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Search Section */}
        <section className="mb-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-3">
              Find Native Trees in Your Area
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Enter your city and state to discover the native tree species that naturally grow in your local ecosystem.
            </p>
          </div>
          
          <TreeSearchForm onSearch={handleSearch} />
        </section>

        {/* Loading State */}
        {isLoading && (
          <section className="text-center py-12" data-testid="loading-state">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-lg text-muted-foreground">
              Searching for native trees in your area...
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              This may take a few moments while we query biodiversity databases.
            </p>
          </section>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <section className="text-center py-12" data-testid="error-state">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="text-destructive text-2xl" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Unable to Find Tree Data
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {error.message || "We couldn't retrieve tree species data for this location. This might be due to limited data coverage or a temporary service issue."}
            </p>
            <button 
              onClick={handleRetry}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              data-testid="button-retry"
            >
              <AlertTriangle className="w-4 h-4 mr-2 inline" />
              Try Again
            </button>
          </section>
        )}

        {/* Results */}
        {results && !isLoading && !error && (
          <>
            {/* Results Header */}
            <section className="mb-6" data-testid="results-header">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold text-foreground">
                    Native Trees in {results.location}
                  </h3>
                  <p className="text-muted-foreground">
                    Found {results.count} native tree species
                  </p>
                </div>
              </div>
            </section>

            {/* Tree Species List */}
            {results.species.length > 0 ? (
              <section className="mb-8" data-testid="results-list">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {results.species.map((species) => (
                    <TreeSpeciesCard key={species.id} species={species} />
                  ))}
                </div>
              </section>
            ) : (
              <section className="text-center py-12" data-testid="no-results">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sprout className="text-muted-foreground text-2xl" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  No Native Trees Found
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  We couldn't find native tree data for this location. Try searching for a different city or check back later as our database is continuously updated.
                </p>
              </section>
            )}
          </>
        )}

        {/* Info Section */}
        <section className="mt-16 bg-muted/30 rounded-xl p-8 border border-border">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-foreground mb-4 text-center">
              Why Native Trees Matter
            </h3>
            <div className="grid md:grid-cols-3 gap-6 mt-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Sprout className="text-primary text-xl" />
                </div>
                <h4 className="font-semibold text-foreground mb-2">Ecosystem Support</h4>
                <p className="text-sm text-muted-foreground">
                  Native trees provide essential habitat and food sources for local wildlife, supporting biodiversity in your area.
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Droplets className="text-primary text-xl" />
                </div>
                <h4 className="font-semibold text-foreground mb-2">Water Conservation</h4>
                <p className="text-sm text-muted-foreground">
                  Adapted to local climate conditions, native trees typically require less water and maintenance than non-native species.
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Shield className="text-primary text-xl" />
                </div>
                <h4 className="font-semibold text-foreground mb-2">Climate Resilience</h4>
                <p className="text-sm text-muted-foreground">
                  Native trees are naturally resistant to local pests and diseases, making them more resilient to environmental changes.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
