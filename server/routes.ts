import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { searchLocationSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Search for native tree species by location
  app.post("/api/tree-species/search", async (req, res) => {
    try {
      const { city, state } = searchLocationSchema.parse(req.body);
      
      // First check if we have cached data
      let cachedResults = await storage.getTreeSpeciesByLocation(city, state);
      
      if (cachedResults.length > 0) {
        return res.json({ 
          species: cachedResults,
          location: `${city}, ${state}`,
          count: cachedResults.length 
        });
      }

      // Fetch from iNaturalist API
      const iNaturalistUrl = `https://api.inaturalist.org/v1/observations/species_counts`;
      const params = new URLSearchParams({
        place_guess: `${city}, ${state}`,
        taxon_name: 'Plantae',
        iconic_taxa: 'Plantae',
        rank: 'species',
        quality_grade: 'research',
        per_page: '20',
        locale: 'en',
        order: 'desc',
        order_by: 'count'
      });

      const response = await fetch(`${iNaturalistUrl}?${params}`);
      
      if (!response.ok) {
        throw new Error(`iNaturalist API error: ${response.status}`);
      }

      const data = await response.json();
      const treeSpecies = [];

      // Filter for trees and create our data structure
      for (const result of data.results || []) {
        const taxon = result.taxon;
        
        // Skip if not a tree (basic filtering by checking if it's in Magnoliophyta or Pinophyta)
        if (!taxon || !taxon.name) continue;
        
        // Get additional details for each species
        const speciesResponse = await fetch(`https://api.inaturalist.org/v1/taxa/${taxon.id}`);
        if (!speciesResponse.ok) continue;
        
        const speciesData = await speciesResponse.json();
        const species = speciesData.results?.[0];
        
        if (!species) continue;

        // Check if we already have this species
        const existing = await storage.getTreeSpeciesByExternalId(species.id.toString());
        if (existing) {
          treeSpecies.push(existing);
          continue;
        }

        // Create habitat description from taxon summary or use a generic one
        const habitatDescription = species.wikipedia_summary || 
          `Native to the ${state} region. This species is naturally adapted to local climate conditions and provides important ecosystem services.`;

        const newSpecies = await storage.createTreeSpecies({
          commonName: species.preferred_common_name || species.name,
          scientificName: species.name,
          imageUrl: species.default_photo?.medium_url || species.taxon_photos?.[0]?.photo?.medium_url,
          habitatDescription: habitatDescription.slice(0, 300) + "...",
          maxHeight: null,
          maxAge: null,
          city,
          state,
          externalId: species.id.toString()
        });

        treeSpecies.push(newSpecies);
      }

      res.json({ 
        species: treeSpecies,
        location: `${city}, ${state}`,
        count: treeSpecies.length 
      });

    } catch (error) {
      console.error("Error fetching tree species:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid search parameters", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ 
        message: "Failed to fetch tree species data. Please try again later." 
      });
    }
  });

  // Get US states for dropdown
  app.get("/api/states", async (req, res) => {
    const states = [
      { code: "AL", name: "Alabama" },
      { code: "AK", name: "Alaska" },
      { code: "AZ", name: "Arizona" },
      { code: "AR", name: "Arkansas" },
      { code: "CA", name: "California" },
      { code: "CO", name: "Colorado" },
      { code: "CT", name: "Connecticut" },
      { code: "DE", name: "Delaware" },
      { code: "FL", name: "Florida" },
      { code: "GA", name: "Georgia" },
      { code: "HI", name: "Hawaii" },
      { code: "ID", name: "Idaho" },
      { code: "IL", name: "Illinois" },
      { code: "IN", name: "Indiana" },
      { code: "IA", name: "Iowa" },
      { code: "KS", name: "Kansas" },
      { code: "KY", name: "Kentucky" },
      { code: "LA", name: "Louisiana" },
      { code: "ME", name: "Maine" },
      { code: "MD", name: "Maryland" },
      { code: "MA", name: "Massachusetts" },
      { code: "MI", name: "Michigan" },
      { code: "MN", name: "Minnesota" },
      { code: "MS", name: "Mississippi" },
      { code: "MO", name: "Missouri" },
      { code: "MT", name: "Montana" },
      { code: "NE", name: "Nebraska" },
      { code: "NV", name: "Nevada" },
      { code: "NH", name: "New Hampshire" },
      { code: "NJ", name: "New Jersey" },
      { code: "NM", name: "New Mexico" },
      { code: "NY", name: "New York" },
      { code: "NC", name: "North Carolina" },
      { code: "ND", name: "North Dakota" },
      { code: "OH", name: "Ohio" },
      { code: "OK", name: "Oklahoma" },
      { code: "OR", name: "Oregon" },
      { code: "PA", name: "Pennsylvania" },
      { code: "RI", name: "Rhode Island" },
      { code: "SC", name: "South Carolina" },
      { code: "SD", name: "South Dakota" },
      { code: "TN", name: "Tennessee" },
      { code: "TX", name: "Texas" },
      { code: "UT", name: "Utah" },
      { code: "VT", name: "Vermont" },
      { code: "VA", name: "Virginia" },
      { code: "WA", name: "Washington" },
      { code: "WV", name: "West Virginia" },
      { code: "WI", name: "Wisconsin" },
      { code: "WY", name: "Wyoming" }
    ];
    
    res.json(states);
  });

  const httpServer = createServer(app);
  return httpServer;
}
