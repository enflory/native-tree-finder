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
- **Biodiversity Data**: iNaturalist API for fetching native plant species data
- **API Strategy**: External API calls with local caching to reduce API load
- **Data Processing**: Filtering and transformation of iNaturalist data to focus on tree species

# External Dependencies

## Third-Party Services
- **iNaturalist API**: Primary data source for species information and biodiversity data
- **Neon Database**: Serverless PostgreSQL hosting for production data storage

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