"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  FolderOpen, 
  FileText, 
  Calendar, 
  CheckSquare,
  Settings,
  ChevronDown,
  ChevronRight,
  Database,
  Search,
  Bell,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/auth-store";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavigationItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  children?: NavigationItem[];
}

const navigationItems: NavigationItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Users",
    href: "/users",
    icon: Users,
    permission: "users.read",
    children: [
      { label: "All Users", href: "/users", icon: Users },
      { label: "Roles", href: "/users/roles", icon: Users },
      { label: "Permissions", href: "/users/permissions", icon: Users },
    ],
  },
  {
    label: "Projects",
    href: "/projects",
    icon: FolderOpen,
    permission: "projects.read",
    children: [
      { label: "All Projects", href: "/projects", icon: FolderOpen },
      { label: "Create Project", href: "/projects/new", icon: FolderOpen },
    ],
  },
  {
    label: "Documents",
    href: "/documents",
    icon: FileText,
    permission: "documents.read",
    children: [
      { label: "All Documents", href: "/documents", icon: FileText },
      { label: "Upload", href: "/documents/upload", icon: FileText },
    ],
  },
  {
    label: "ACCU Applications",
    href: "/accu-applications",
    icon: CheckSquare,
    permission: "accu_applications.read",
    children: [
      { label: "Applications", href: "/accu-applications", icon: CheckSquare },
      { label: "Inventory", href: "/accu-applications/inventory", icon: Database },
    ],
  },
  {
    label: "Calendar",
    href: "/calendar",
    icon: Calendar,
    permission: "calendar.events.read",
    children: [
      { label: "Events", href: "/calendar", icon: Calendar },
      { label: "Deadlines", href: "/calendar/deadlines", icon: Calendar },
    ],
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    permission: "settings.read",
    children: [
      { label: "Profile", href: "/settings/profile", icon: Settings },
      { label: "System", href: "/settings/system", icon: Settings },
    ],
  },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { hasPermission } = useAuth();
  const [expandedItems, setExpandedItems] = useState<string[]>(["/dashboard"]);

  const toggleExpanded = (href: string) => {
    setExpandedItems(prev =>
      prev.includes(href)
        ? prev.filter(item => item !== href)
        : [...prev, href]
    );
  };

  const filteredItems = navigationItems.filter(item => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  });

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-64 bg-background border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-primary rounded-md flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">ACCU</span>
              </div>
              <span className="font-bold text-xl">Platform</span>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-1 hover:bg-muted rounded-md"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            {filteredItems.map((item) => (
              <div key={item.href}>
                {item.children ? (
                  <div>
                    <button
                      onClick={() => toggleExpanded(item.href)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors",
                        pathname.startsWith(item.href) && "bg-muted text-foreground"
                      )}
                    >
                      <div className="flex items-center space-x-3">
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </div>
                      {expandedItems.includes(item.href) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    
                    {expandedItems.includes(item.href) && (
                      <div className="ml-6 mt-2 space-y-1">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              "flex items-center space-x-3 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors",
                              pathname === child.href && "bg-muted text-foreground"
                            )}
                            onClick={onClose}
                          >
                            <child.icon className="h-4 w-4" />
                            <span>{child.label}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center space-x-3 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors",
                      pathname === item.href && "bg-muted text-foreground"
                    )}
                    onClick={onClose}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                )}
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t">
            <div className="text-xs text-muted-foreground text-center">
              ACCU Platform v1.0
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}