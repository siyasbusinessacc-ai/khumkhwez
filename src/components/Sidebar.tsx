import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Menu, X, Home, User, Package, PieChart, HelpCircle, Shield, ChefHat, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Logo } from "./Logo";

export const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { isKitchen, isAdmin } = useUserRoles();

  const menuItems = [
    { label: "Dashboard", icon: Home, path: "/" },
    { label: "Profile", icon: User, path: "/profile" },
    { label: "Packages", icon: Package, path: "/" }, // Usually anchors to plan selector
    { label: "Referrals", icon: PieChart, path: "/refer" },
    { label: "Help", icon: HelpCircle, path: "#" },
  ];

  const adminItems = [
    ...(isKitchen ? [{ label: "Kitchen Console", icon: ChefHat, path: "/kitchen" }] : []),
    ...(isAdmin ? [{ label: "Admin Dashboard", icon: Shield, path: "/admin" }] : []),
  ];

  const toggle = () => setIsOpen(!isOpen);

  const handleNavigate = (path: string) => {
    if (path === "#") return;
    navigate(path);
    setIsOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={toggle}
        className="fixed top-6 right-6 z-50 p-3 bg-card rounded-2xl ring-1 ring-border shadow-lg text-foreground hover:text-primary transition-colors"
        aria-label="Toggle Menu"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm transition-opacity"
          onClick={toggle}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-0 right-0 z-40 h-full w-72 bg-card border-l border-border transition-transform duration-300 ease-in-out transform ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full p-6">
          <div className="flex flex-col items-center gap-2 mb-10 pt-4">
            <Logo size={80} variant="symbol" />
            <p className="font-serif text-lg text-foreground mt-2">Khumkhwez</p>
          </div>

          <nav className="flex-1 space-y-2 overflow-y-auto">
            <p className="text-toast text-[10px] uppercase tracking-widest font-bold mb-2 ml-4">Main Menu</p>
            {menuItems.map((item) => (
              <button
                key={item.label}
                onClick={() => handleNavigate(item.path)}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                  location.pathname === item.path
                    ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                    : "text-toast hover:bg-secondary hover:text-foreground"
                }`}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}

            {adminItems.length > 0 && (
              <>
                <div className="pt-6 pb-2">
                  <p className="text-toast text-[10px] uppercase tracking-widest font-bold mb-2 ml-4">Staff & Admin</p>
                </div>
                {adminItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => handleNavigate(item.path)}
                    className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                      location.pathname === item.path
                        ? "bg-brass/10 text-brass ring-1 ring-brass/20"
                        : "text-toast hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <item.icon size={20} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </>
            )}
          </nav>

          <div className="pt-6 mt-6 border-t border-border">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-all"
            >
              <LogOut size={20} />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
