import { cn } from '../../lib/utils/cn';
import { useLayoutStore } from '../../store/layoutStore';

export function PageContainer({ children }: { children: React.ReactNode }) {
  const { isSidebarCollapsed } = useLayoutStore();
  
  return (
    <div className={cn(
      "min-h-screen th-bg flex flex-col pt-0 transition-all duration-300 ease-in-out relative flex-1 min-w-0",
      isSidebarCollapsed ? "ml-16" : "ml-64"
    )}>
      <div className="relative z-10 flex flex-col flex-1">
        {children}
      </div>
    </div>
  );
}
