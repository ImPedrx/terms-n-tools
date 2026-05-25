import { Linkedin, Github } from 'lucide-react';

export function CreditsFooter({ collapsed }: { collapsed?: boolean }) {
  if (collapsed) {
    return (
      <div className="flex justify-center gap-1 py-2">
        <a href="https://www.linkedin.com/in/pedrx/" target="_blank" rel="noopener noreferrer"
          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-sidebar-foreground/40 hover:text-sidebar-primary hover:bg-sidebar-accent transition-colors" title="LinkedIn">
          <Linkedin className="h-3.5 w-3.5" />
        </a>
        <a href="https://github.com/ImPedrx" target="_blank" rel="noopener noreferrer"
          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-sidebar-foreground/40 hover:text-sidebar-primary hover:bg-sidebar-accent transition-colors" title="GitHub">
          <Github className="h-3.5 w-3.5" />
        </a>
      </div>
    );
  }
  return (
    <div className="px-3 py-3 space-y-2">
      <p className="text-[10px] text-sidebar-foreground/40 text-center font-medium flex items-center justify-center gap-1">
        Desenvolvido por <span className="font-bold text-sidebar-foreground/70">Pedrx</span>
      </p>
      <div className="flex justify-center gap-2">
        <a href="https://www.linkedin.com/in/pedrx/" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1 rounded-md bg-sidebar-accent/50 text-sidebar-foreground/70 hover:bg-sidebar-primary hover:text-sidebar-primary-foreground transition-colors">
          <Linkedin className="h-3 w-3" /> LinkedIn
        </a>
        <a href="https://github.com/ImPedrx" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1 rounded-md bg-sidebar-accent/50 text-sidebar-foreground/70 hover:bg-sidebar-primary hover:text-sidebar-primary-foreground transition-colors">
          <Github className="h-3 w-3" /> GitHub
        </a>
      </div>
    </div>
  );
}
