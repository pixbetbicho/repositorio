import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useState } from "react";
import { Menu, X } from "lucide-react";

interface NavLinkProps {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}

function NavLink({ href, active, children }: NavLinkProps) {
  const [, navigate] = useLocation();
  
  return (
    <a 
      href={href} 
      className={`px-3 py-2 text-sm font-medium ${active 
        ? 'border-b-2 border-primary text-white' 
        : 'text-gray-300 hover:text-white'}`}
      onClick={(e) => {
        e.preventDefault();
        navigate(href);
      }}
    >
      {children}
    </a>
  );
}

export function Navbar() {
  const { user, logoutMutation } = useAuth();
  const [location, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const handleLogout = () => {
    logoutMutation.mutate();
    navigate('/auth');
  };
  
  return (
    <nav className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center cursor-pointer" onClick={() => navigate("/")}>
              <img src="/img/logo.png" alt="PixBet Bicho" className="h-10 w-auto my-2" />
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <NavLink href="/" active={location === "/"}>Início</NavLink>
              {user && (
                <>
                  <NavLink href="/user-dashboard" active={location === "/user-dashboard"}>Painel do Usuário</NavLink>
                  {user.isAdmin && (
                    <NavLink href="/admin-dashboard" active={location === "/admin-dashboard"}>Painel Admin</NavLink>
                  )}
                </>
              )}
            </div>
          </div>
          
          <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
            {user ? (
              <>
                <span className="text-sm text-gray-300">
                  {user.name || user.username}
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleLogout}
                  className="text-white border-gray-700 hover:bg-gray-800"
                >
                  Sair
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate("/auth")}
                  className="text-white border-gray-700 hover:bg-gray-800"
                >
                  Entrar
                </Button>
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => navigate("/auth?tab=register")}
                >
                  Cadastrar
                </Button>
              </>
            )}
          </div>
          
          <div className="-mr-2 flex items-center sm:hidden">
            <button 
              type="button" 
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-gray-800">
          <div className="flex justify-center py-2">
            <img src="/img/logo.png" alt="PixBet Bicho" className="h-10 w-auto" />
          </div>
          <div className="px-2 pt-2 pb-3 space-y-1">
            <a 
              href="/" 
              className="block px-3 py-2 rounded-md text-base font-medium text-white bg-gray-900"
              onClick={(e) => {
                e.preventDefault();
                navigate("/");
                setMobileMenuOpen(false);
              }}
            >
              Início
            </a>
            
            {user && (
              <>
                <a 
                  href="/user-dashboard" 
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-gray-700"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/user-dashboard");
                    setMobileMenuOpen(false);
                  }}
                >
                  Painel do Usuário
                </a>
                {user.isAdmin && (
                  <a 
                    href="/admin-dashboard" 
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-gray-700"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate("/admin-dashboard");
                      setMobileMenuOpen(false);
                    }}
                  >
                    Painel Admin
                  </a>
                )}
                
                <div className="pt-4 pb-3 border-t border-gray-700">
                  <div className="flex items-center px-5">
                    <div className="ml-3">
                      <div className="text-base font-medium text-white">{user.name || user.username}</div>
                      {user.email && (
                        <div className="text-sm font-medium text-gray-400">{user.email}</div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 px-2 space-y-1">
                    <button
                      className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-400 hover:text-white hover:bg-gray-700"
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                    >
                      Sair
                    </button>
                  </div>
                </div>
              </>
            )}
            
            {!user && (
              <>
                <a 
                  href="/auth" 
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-gray-700"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/auth");
                    setMobileMenuOpen(false);
                  }}
                >
                  Entrar
                </a>
                <a 
                  href="/auth?tab=register" 
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-gray-700"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/auth?tab=register");
                    setMobileMenuOpen(false);
                  }}
                >
                  Cadastrar
                </a>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}