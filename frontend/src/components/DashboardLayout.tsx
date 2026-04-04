import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, PenLine, Upload, History, Bell, User, Menu, Shield, LogOut, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { title: "Dashboard", path: "/", icon: LayoutDashboard, roles: ["admin", "analyst", "viewer"] },
  { title: "Manual Entry", path: "/manual-entry", icon: PenLine, roles: ["admin", "analyst"] },
  { title: "CSV Upload", path: "/csv-upload", icon: Upload, roles: ["admin", "analyst"] },
  { title: "History", path: "/history", icon: History, roles: ["admin", "analyst", "viewer"] },
  { title: "Users", path: "/users", icon: Users, roles: ["admin"] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-sidebar text-sidebar-foreground flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="p-6 flex items-center gap-3 border-b border-sidebar-border">
          <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Shield className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div className="leading-tight">
            <p className="font-bold text-sm">FraudShield</p>
            <p className="text-xs text-sidebar-foreground/60">AI Detection</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems
            .filter((item) => item.roles.includes(user?.role || "viewer"))
            .map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/25"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.title}
                </Link>
              );
            })}
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-3">
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-medium">{user?.username || "User"}</p>
              <p className="text-xs text-sidebar-foreground/50">{user?.role || "viewer"}</p>
            </div>
          </div>
          <Badge variant="outline" className="w-full justify-center text-white">Role: {user?.role || "viewer"}</Badge>
          <Button variant="outline" className="w-full gap-2 text-black" onClick={logout}>
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 h-16 bg-card border-b flex items-center justify-between px-6 shadow-sm">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground hidden sm:block">Public Fund Misuse Detection</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-fraud rounded-full" />
            </Button>
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
