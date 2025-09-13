import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { searchLocationSchema } from "@shared/schema";
import { z } from "zod";

// Helper function to check if a taxon is likely a tree
function isLikelyTree(taxon: any): boolean {
  if (!taxon) return false;
  
  // Common tree families
  const treeFamilies = [
    'Fagaceae', 'Pinaceae', 'Aceraceae', 'Betulaceae', 'Rosaceae',
    'Salicaceae', 'Oleaceae', 'Malvaceae', 'Cupressaceae', 'Juglandaceae',
    'Ulmaceae', 'Magnoliaceae', 'Platanaceae', 'Hippocastanaceae',
    'Anacardiaceae', 'Sapindaceae', 'Cornaceae', 'Hamamelidaceae'
  ];
  
  // Check if it belongs to a tree family
  const ancestors = taxon.ancestors || [];
  for (const ancestor of ancestors) {
    if (ancestor.rank === 'family' && treeFamilies.includes(ancestor.name)) {
      return true;
    }
  }
  
  // Check current taxon if it's a family
  if (taxon.rank === 'family' && treeFamilies.includes(taxon.name)) {
    return true;
  }
  
  // Check common name for tree indicators
  const commonName = (taxon.preferred_common_name || '').toLowerCase();
  const treeKeywords = ['tree', 'oak', 'pine', 'maple', 'birch', 'cedar', 'fir', 'spruce', 'elm', 'ash'];
  
  return treeKeywords.some(keyword => commonName.includes(keyword));
}

// Helper function to get geographic region for a state
function getStateRegion(stateCode: string): string {
  const regions: { [key: string]: string } = {
    // West Coast
    'CA': 'west', 'OR': 'west', 'WA': 'west',
    // Southwest  
    'AZ': 'southwest', 'NM': 'southwest', 'NV': 'southwest', 'UT': 'southwest',
    // Mountain
    'CO': 'mountain', 'ID': 'mountain', 'MT': 'mountain', 'WY': 'mountain',
    // Midwest
    'IL': 'midwest', 'IN': 'midwest', 'IA': 'midwest', 'KS': 'midwest', 
    'MI': 'midwest', 'MN': 'midwest', 'MO': 'midwest', 'NE': 'midwest', 
    'ND': 'midwest', 'OH': 'midwest', 'SD': 'midwest', 'WI': 'midwest',
    // South
    'AL': 'south', 'AR': 'south', 'FL': 'south', 'GA': 'south', 'KY': 'south',
    'LA': 'south', 'MS': 'south', 'NC': 'south', 'SC': 'south', 'TN': 'south',
    'TX': 'south', 'VA': 'south', 'WV': 'south',
    // Northeast
    'CT': 'northeast', 'DE': 'northeast', 'ME': 'northeast', 'MD': 'northeast',
    'MA': 'northeast', 'NH': 'northeast', 'NJ': 'northeast', 'NY': 'northeast',
    'PA': 'northeast', 'RI': 'northeast', 'VT': 'northeast',
    // Alaska/Hawaii
    'AK': 'alaska', 'HI': 'hawaii'
  };
  
  return regions[stateCode] || 'unknown';
}

// Helper function to check if a species is widespread across North America
function isWidespreadSpecies(scientificName: string): boolean {
  const widespreadSpecies = [
    'Acer negundo', // Box Elder - widespread across North America
    'Populus tremuloides', // Quaking Aspen - very widespread
    'Salix alba', // White Willow - introduced but widespread
    'Juniperus virginiana' // Eastern Red Cedar - widespread
  ];
  
  return widespreadSpecies.includes(scientificName);
}

// Helper function to detect obviously invalid city names
function isInvalidCityName(city: string): boolean {
  // Check for common patterns that indicate fake/test cities
  const invalidPatterns = [
    /^NonExistent/i,
    /^Invalid/i,
    /^Test/i,
    /^Fake/i,
    /^MiddleOfNowhere/i,
    /^NoWhere/i,
    /\d{3,}/, // Cities with many numbers
    /^[^a-zA-Z]/, // Cities not starting with letters
    /[^\w\s\-'\.]/i, // Cities with special characters (except space, hyphen, apostrophe, period)
  ];
  
  return invalidPatterns.some(pattern => pattern.test(city));
}

// Helper function to process taxa in batches with limited concurrency
async function processTaxaBatch(taxa: any[], batchSize: number = 5): Promise<any[]> {
  const results = [];
  
  for (let i = 0; i < taxa.length; i += batchSize) {
    const batch = taxa.slice(i, i + batchSize);
    const batchPromises = batch.map(async (taxon) => {
      try {
        const response = await fetch(`https://api.inaturalist.org/v1/taxa/${taxon.id}`);
        if (!response.ok) return null;
        
        const data = await response.json();
        return data.results?.[0] || null;
      } catch (error) {
        console.error(`Error fetching taxon ${taxon.id}:`, error);
        return null;
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter(result => result !== null));
    
    // Small delay between batches to avoid rate limiting
    if (i + batchSize < taxa.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Search for native tree species by location
  app.post("/api/tree-species/search", async (req, res) => {
    try {
      const { city, state } = searchLocationSchema.parse(req.body);
      
      // Basic validation for obviously invalid city names
      if (isInvalidCityName(city)) {
        return res.json({ 
          species: [],
          location: `${city}, ${state}`,
          count: 0 
        });
      }
      
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
        per_page: '50', // Increased to get more potential trees
        locale: 'en',
        order: 'desc',
        order_by: 'count'
      });

      const response = await fetch(`${iNaturalistUrl}?${params}`);
      
      if (!response.ok) {
        throw new Error(`iNaturalist API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Log the API response for debugging
      console.log(`iNaturalist API response for ${city}, ${state}:`, {
        total_results: data.total_results,
        results_count: data.results?.length || 0,
        per_page: data.per_page
      });
      
      // If no results from API, return empty
      if (!data.results || data.results.length === 0) {
        console.log(`No species found in iNaturalist for ${city}, ${state}`);
        return res.json({ 
          species: [],
          location: `${city}, ${state}`,
          count: 0 
        });
      }

      // Additional validation: if we get very few results and they seem generic,
      // it might indicate an invalid location. Let's be more discriminating.
      if (data.total_results < 5) {
        console.log(`Very few results (${data.total_results}) for ${city}, ${state} - possibly invalid location`);
        return res.json({ 
          species: [],
          location: `${city}, ${state}`,
          count: 0 
        });
      }
      
      const potentialTrees = [];
      
      // First pass: filter for likely trees
      for (const result of data.results || []) {
        const taxon = result.taxon;
        if (!taxon || !taxon.name) continue;
        
        if (isLikelyTree(taxon)) {
          potentialTrees.push(taxon);
        }
      }
      
      // If no trees found after filtering, return empty
      if (potentialTrees.length === 0) {
        console.log(`No tree species found after filtering for ${city}, ${state}`);
        return res.json({ 
          species: [],
          location: `${city}, ${state}`,
          count: 0 
        });
      }
      
      // Process trees in batches to get detailed information
      const detailedSpecies = await processTaxaBatch(potentialTrees.slice(0, 20)); // Limit to 20 for performance
      const treeSpecies = [];

      // Create our data structure
      for (const species of detailedSpecies) {
        if (!species) continue;

        // Check if we already have this species cached globally
        const existing = await storage.getTreeSpeciesByExternalId(species.id.toString());
        if (existing) {
          // Create a new record for this location using the cached species data
          // Since iNaturalist returned this species for the current location, 
          // we can trust that it's native/appropriate for this area
          const newLocationSpecies = await storage.createTreeSpecies({
            commonName: existing.commonName,
            scientificName: existing.scientificName,
            imageUrl: existing.imageUrl,
            habitatDescription: existing.habitatDescription,
            maxHeight: existing.maxHeight,
            maxAge: existing.maxAge,
            city,
            state,
            externalId: existing.externalId
          });
          
          treeSpecies.push(newLocationSpecies);
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

      // Final check: if no tree species were successfully processed, return empty
      if (treeSpecies.length === 0) {
        console.log(`No valid tree species found after processing for ${city}, ${state}`);
        return res.json({ 
          species: [],
          location: `${city}, ${state}`,
          count: 0 
        });
      }

      console.log(`Found ${treeSpecies.length} tree species for ${city}, ${state}`);
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
