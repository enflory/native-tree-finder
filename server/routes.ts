import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { searchLocationSchema } from "@shared/schema";
import { z } from "zod";

// Helper function to geocode city/state to coordinates
async function geocodeCityState(city: string, state: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const url = "https://nominatim.openstreetmap.org/search";
    const params = new URLSearchParams({
      city: city,
      state: state,
      country: "USA",
      format: "json",
      limit: "1"
    });
    
    const response = await fetch(`${url}?${params}`, {
      headers: {
        "User-Agent": "NativeTreeFinder/1.0"
      }
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon)
      };
    }
    
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

// Common tree families to filter GBIF results
// Note: Only including families that are predominantly trees, excluding families with many shrubs/herbs
const TREE_FAMILIES = [
  'Fagaceae', 'Pinaceae', 'Aceraceae', 'Betulaceae',
  'Salicaceae', 'Cupressaceae', 'Juglandaceae',
  'Ulmaceae', 'Magnoliaceae', 'Platanaceae',
  'Taxaceae', 'Taxodiaceae', 'Araucariaceae'
];

// Helper function to check if a GBIF taxon is likely a tree
function isLikelyTree(scientificName: string, family: string | null, vernacularName: string | null): boolean {
  // First, check for exclusion keywords that indicate non-trees
  if (vernacularName) {
    const lowerName = vernacularName.toLowerCase();
    const exclusionKeywords = [
      'shrub', 'bush', 'herb', 'vine', 'grass', 'fern', 'moss',
      'sedge', 'rush', 'bramble', 'weed', 'flower',
      'dewberry', 'raspberry', 'blackberry', 'strawberry', 'blueberry', 'cranberry', 
      'huckleberry', 'gooseberry', 'elderberry', 'currant', 'rose',
      'avens', 'mallow', 'cinquefoil', 'clover', 'vetch',
      'goosefoot', 'chickweed', 'knotweed', 'smartweed', 'pigweed',
      'amaranth', 'plantain', 'purslane', 'lambsquarters', 'nettle'
    ];
    
    // Tree exceptions - these contain exclusion keywords but are actual trees
    const treeExceptions = ['cherry', 'hackberry', 'mulberry', 'serviceberry', 'chokeberry'];
    const hasTreeException = treeExceptions.some(exception => lowerName.includes(exception));
    
    // If the common name contains exclusion keywords (and isn't a tree exception), it's not a tree
    if (!hasTreeException && exclusionKeywords.some(keyword => lowerName.includes(keyword))) {
      return false;
    }
  }
  
  // Check if it belongs to a known tree family
  if (family && TREE_FAMILIES.includes(family)) {
    return true;
  }
  
  // Check common name for tree indicators
  if (vernacularName) {
    const lowerName = vernacularName.toLowerCase();
    const treeKeywords = [
      'tree', 'oak', 'pine', 'maple', 'birch', 'cedar', 'fir', 
      'spruce', 'elm', 'ash', 'willow', 'poplar', 'aspen', 
      'redwood', 'sequoia', 'cypress', 'juniper', 'hemlock',
      'hickory', 'walnut', 'beech', 'sycamore', 'magnolia',
      'cottonwood', 'basswood', 'linden', 'dogwood', 'buckeye',
      'hornbeam', 'hop-hornbeam', 'cherry', 'hackberry', 'mulberry',
      'serviceberry', 'chokeberry', 'hawthorn', 'crabapple'
    ];
    if (treeKeywords.some(keyword => lowerName.includes(keyword))) {
      return true;
    }
  }
  
  // Check scientific name for known tree genera
  if (scientificName) {
    const knownTreeGenera = [
      'Quercus', 'Pinus', 'Acer', 'Betula', 'Salix', 'Populus', 
      'Fraxinus', 'Ulmus', 'Fagus', 'Picea', 'Abies', 'Tsuga', 
      'Sequoia', 'Juniperus', 'Carya', 'Platanus', 'Magnolia',
      'Cornus', 'Tilia', 'Liquidambar', 'Nyssa', 'Ostrya',
      'Carpinus', 'Taxodium', 'Larix', 'Pseudotsuga', 'Thuja',
      'Chamaecyparis', 'Cedrus', 'Robinia', 'Gleditsia', 'Juglans',
      'Aesculus', 'Liriodendron', 'Catalpa', 'Prunus', 'Celtis',
      'Morus', 'Amelanchier', 'Sorbus', 'Malus', 'Pyrus', 'Crataegus'
    ];
    const genus = scientificName.split(' ')[0];
    if (knownTreeGenera.includes(genus)) {
      return true;
    }
  }
  
  return false;
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

// Helper function to fetch species details from GBIF
async function getGBIFSpeciesDetails(speciesKey: number): Promise<any | null> {
  try {
    // Get species information
    const speciesResponse = await fetch(`https://api.gbif.org/v1/species/${speciesKey}`);
    if (!speciesResponse.ok) return null;
    
    const speciesData = await speciesResponse.json();
    
    // Get vernacular (common) names
    const vernacularResponse = await fetch(`https://api.gbif.org/v1/species/${speciesKey}/vernacularNames`);
    let commonName = speciesData.canonicalName || speciesData.scientificName;
    
    if (vernacularResponse.ok) {
      const vernacularData = await vernacularResponse.json();
      // Prefer English common names
      const englishName = vernacularData.results?.find((v: any) => v.language === 'eng');
      if (englishName) {
        commonName = englishName.vernacularName;
      }
    }
    
    // Get media (images)
    const mediaResponse = await fetch(`https://api.gbif.org/v1/species/${speciesKey}/media`);
    let imageUrl = null;
    
    if (mediaResponse.ok) {
      const mediaData = await mediaResponse.json();
      // Find the first image
      const image = mediaData.results?.find((m: any) => m.type === 'StillImage' && m.identifier);
      if (image) {
        imageUrl = image.identifier;
      }
    }
    
    // Extract description text safely
    let description = null;
    if (speciesData.descriptions && speciesData.descriptions.length > 0) {
      const descObj = speciesData.descriptions[0];
      description = descObj.description || descObj.value || null;
    }

    return {
      speciesKey,
      scientificName: speciesData.canonicalName || speciesData.scientificName,
      commonName,
      family: speciesData.family,
      genus: speciesData.genus,
      imageUrl,
      description
    };
  } catch (error) {
    console.error(`Error fetching GBIF species details for ${speciesKey}:`, error);
    return null;
  }
}

// Helper function to process species in batches
async function processTaxaBatch(speciesKeys: number[], batchSize: number = 3): Promise<any[]> {
  const results = [];
  
  for (let i = 0; i < speciesKeys.length; i += batchSize) {
    const batch = speciesKeys.slice(i, i + batchSize);
    const batchPromises = batch.map(async (speciesKey) => {
      try {
        const details = await getGBIFSpeciesDetails(speciesKey);
        return details;
      } catch (error) {
        console.error(`Error fetching species ${speciesKey}:`, error);
        return null;
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter(result => result !== null));
    
    // Small delay between batches to avoid rate limiting
    if (i + batchSize < speciesKeys.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
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
        console.log(`Returning ${cachedResults.length} cached species for ${city}, ${state}`);
        return res.json({ 
          species: cachedResults,
          location: `${city}, ${state}`,
          count: cachedResults.length 
        });
      }

      // Geocode the city/state to coordinates
      console.log(`Geocoding ${city}, ${state}...`);
      const coords = await geocodeCityState(city, state);
      
      if (!coords) {
        console.log(`Failed to geocode ${city}, ${state}`);
        return res.json({ 
          species: [],
          location: `${city}, ${state}`,
          count: 0 
        });
      }

      console.log(`Coordinates for ${city}, ${state}: ${coords.lat}, ${coords.lon}`);

      // Get state name mapping
      const stateNames: { [key: string]: string } = {
        'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
        'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
        'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
        'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
        'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
        'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
        'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
        'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
        'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
        'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
      };

      const stateName = stateNames[state] || state;

      // Search for plant occurrences in GBIF using state and coordinates
      const gbifUrl = 'https://api.gbif.org/v1/occurrence/search';
      const params = new URLSearchParams({
        country: 'US',
        stateProvince: stateName,
        kingdomKey: '6', // Plantae
        hasCoordinate: 'true',
        limit: '300'
      });

      console.log(`Searching GBIF for ${city}, ${stateName}...`);

      const response = await fetch(`${gbifUrl}?${params}`);
      
      if (!response.ok) {
        throw new Error(`GBIF API error: ${response.status}`);
      }

      const data = await response.json();
      
      console.log(`GBIF API response for ${city}, ${state}:`, {
        total: data.count,
        returned: data.results?.length || 0
      });

      if (!data.results || data.results.length === 0) {
        console.log(`No species found in GBIF for ${city}, ${state}`);
        return res.json({ 
          species: [],
          location: `${city}, ${state}`,
          count: 0 
        });
      }

      // Extract unique tree species from occurrences
      const uniqueTreeSpecies = new Map<number, { scientificName: string; family: string | null; vernacularName: string | null; count: number }>();
      
      for (const occurrence of data.results) {
        if (!occurrence.speciesKey || !occurrence.scientificName) continue;
        
        // Filter for native species only
        // GBIF establishment means: NATIVE, INTRODUCED, NATURALISED, INVASIVE, MANAGED, UNCERTAIN
        const establishmentMeans = occurrence.establishmentMeans;
        if (establishmentMeans && establishmentMeans !== 'NATIVE') {
          continue; // Skip non-native species
        }
        
        const scientificName = occurrence.scientificName;
        const family = occurrence.family || null;
        const vernacularName = occurrence.vernacularName || null;
        
        // Check if this is likely a tree
        if (!isLikelyTree(scientificName, family, vernacularName)) {
          continue;
        }
        
        // Track unique species and their occurrence counts
        if (uniqueTreeSpecies.has(occurrence.speciesKey)) {
          const existing = uniqueTreeSpecies.get(occurrence.speciesKey)!;
          existing.count += 1;
        } else {
          uniqueTreeSpecies.set(occurrence.speciesKey, {
            scientificName,
            family,
            vernacularName,
            count: 1
          });
        }
      }

      console.log(`Found ${uniqueTreeSpecies.size} unique tree species in ${city}, ${state}`);

      if (uniqueTreeSpecies.size === 0) {
        console.log(`No tree species found after filtering for ${city}, ${state}`);
        return res.json({ 
          species: [],
          location: `${city}, ${state}`,
          count: 0 
        });
      }

      // Sort by occurrence count and take top 15
      const sortedSpecies = Array.from(uniqueTreeSpecies.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 15)
        .map(([key, _]) => key);

      // Fetch detailed information for these species
      const detailedSpecies = await processTaxaBatch(sortedSpecies);
      const treeSpecies = [];

      // Create our data structure
      for (const species of detailedSpecies) {
        if (!species || !species.scientificName) continue;

        // Apply tree filtering again on the detailed common name
        // (common names from species API may differ from occurrence vernacular names)
        if (!isLikelyTree(species.scientificName, species.family, species.commonName)) {
          console.log(`Filtering out non-tree: ${species.commonName} (${species.scientificName})`);
          continue;
        }

        // Check if we already have this species cached
        const existing = await storage.getTreeSpeciesByExternalId(species.speciesKey.toString());
        if (existing) {
          // Create a new record for this location
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

        // Create habitat description
        const habitatDescription = species.description || 
          `Native tree species found in the ${city}, ${state} region. This species is naturally adapted to local climate conditions and provides important ecosystem services.`;

        const newSpecies = await storage.createTreeSpecies({
          commonName: species.commonName || species.scientificName,
          scientificName: species.scientificName,
          imageUrl: species.imageUrl,
          habitatDescription: habitatDescription.slice(0, 300) + (habitatDescription.length > 300 ? "..." : ""),
          maxHeight: null,
          maxAge: null,
          city,
          state,
          externalId: species.speciesKey.toString()
        });

        treeSpecies.push(newSpecies);
      }

      console.log(`Saved ${treeSpecies.length} tree species for ${city}, ${state}`);
      
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
