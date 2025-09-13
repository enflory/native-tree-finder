import { Trees } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-card border-t border-border mt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Trees className="text-primary-foreground" />
              </div>
              <span className="font-bold text-foreground">Native Trees Finder</span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Helping you discover and learn about the native tree species in your local ecosystem. 
              Data powered by biodiversity databases and scientific research.
            </p>
          </div>
          <div>
            <h5 className="font-semibold text-foreground mb-3">Resources</h5>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  Tree Identification Guide
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  Planting Tips
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  Conservation Programs
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  Scientific Sources
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h5 className="font-semibold text-foreground mb-3">Data Sources</h5>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  iNaturalist API
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  GBIF Database
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  USDA Forest Service
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  Local Herbaria
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border mt-8 pt-6 text-center">
          <p className="text-sm text-muted-foreground">
            © 2024 Native Trees Finder. Educational tool for promoting native plant awareness.
          </p>
        </div>
      </div>
    </footer>
  );
}
