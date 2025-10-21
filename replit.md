# Overview

This is a Native Trees Finder web application that helps users discover native tree species in their local area. The application allows users to search by city and state to find information about trees native to their specific location, including details like common names, scientific names, habitat descriptions, and physical characteristics. The data is sourced from the iNaturalist API to provide accurate biodiversity information.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: shadcn/ui components built on top of Radix UI primitives
- **Styling**: Tailwind CSS with a nature-themed design system (green color scheme)
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation for type-safe form handling

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ESM modules
- **API Design**: RESTful API with JSON responses
- **Error Handling**: Centralized error middleware with structured error responses
- **Request Logging**: Custom middleware for API request/response logging

## Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Database Provider**: Configured for Neon Database (serverless PostgreSQL)
- **Schema Management**: Drizzle migrations with shared schema definitions
- **Caching Strategy**: In-memory storage fallback for development/testing scenarios

## Authentication and Authorization
- **Session Management**: PostgreSQL-backed sessions using connect-pg-simple
- **User Model**: Basic username/password authentication with hashed passwords
- **Authorization**: Middleware-based request authentication

## External Service Integrations
- **Biodiversity Data**: GBIF (Global Biodiversity Information Facility) API for fetching native tree species occurrence data
- **Geocoding**: Nominatim (OpenStreetMap) API for converting city/state to geographic coordinates
- **API Strategy**: External API calls with PostgreSQL caching to improve performance and reduce API load
- **Data Processing**: Multi-stage filtering pipeline:
  1. **Tree Filtering**: Removes non-tree species (shrubs, herbs, vines) using family exclusions, keyword detection, and tree-positive genera
  2. **Native Filtering**: Uses GBIF establishmentMeans data with balanced majority-vote logic (>50% native OR <20% introduced) combined with an invasive species blocklist
  3. **Blocklist**: Explicitly filters out 11 known invasive ornamentals (Cherry Laurel, Portugal Laurel, Tree of Heaven, Bradford Pear, Mimosa, Chinese Tallow, etc.) that have incomplete GBIF establishment data
  4. **Species Details**: Fetches detailed information including common names, images, and habitat descriptions from GBIF species API
  
**Native Filtering Strategy**: Due to poor GBIF establishmentMeans data quality (most species have 100% UNKNOWN data), the application uses a balanced approach: (1) Include species with >50% native occurrences, OR (2) Include species with <20% introduced occurrences (giving benefit of doubt to UNKNOWN data), while (3) Using a canonical-name blocklist to catch known invasive ornamentals that slip through

# External Dependencies

## Third-Party Services
- **GBIF API**: Primary data source for species occurrence data and biodiversity information across US states
- **Nominatim (OpenStreetMap)**: Free geocoding service for converting city/state locations to latitude/longitude coordinates
- **Neon Database**: Serverless PostgreSQL hosting for production data storage and species caching

## Key Libraries and Frameworks
- **Database**: Drizzle ORM with PostgreSQL driver (@neondatabase/serverless)
- **UI Components**: Extensive Radix UI component library for accessible interface elements
- **Validation**: Zod for runtime type validation and schema definitions
- **Date Handling**: date-fns for date manipulation and formatting
- **Development**: Replit-specific plugins for development environment integration

## Development Tools
- **Build System**: Vite with React plugin and TypeScript support
- **Code Quality**: TypeScript compiler with strict configuration
- **Styling**: PostCSS with Tailwind CSS and Autoprefixer
- **Package Management**: npm with lockfile for dependency management