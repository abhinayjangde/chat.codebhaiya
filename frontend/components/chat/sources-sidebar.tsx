import { Button } from '@/components/ui/button';
import { X, ExternalLink } from 'lucide-react';
import { Source } from '@/types';

interface SourcesSidebarProps {
  sources: Source[];
  isOpen: boolean;
  onClose: () => void;
}

export function SourcesSidebar({ sources, isOpen, onClose }: SourcesSidebarProps) {
  if (!isOpen || sources.length === 0) return null;

  return (
    <aside className="w-80 border-l bg-muted/30 overflow-y-auto hidden lg:block">
      <div className="sticky top-0 bg-muted/30 backdrop-blur-sm border-b p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Sources</h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {sources.length} source{sources.length !== 1 ? 's' : ''} found
        </p>
      </div>
      
      <div className="p-4 space-y-3">
        {sources.map((source, i) => (
          <a
            key={i}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 rounded-lg bg-card border hover:border-primary/50 transition-colors group"
          >
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-primary/10 text-primary rounded-full text-xs font-medium">
                {source.position}
              </span>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                  {source.title}
                </h4>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {source.snippet}
                </p>
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <ExternalLink className="h-3 w-3" />
                  <span className="truncate">
                    {new URL(source.url).hostname.replace('www.', '')}
                  </span>
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </aside>
  );
}
