import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@o4o/auth-context';
import { ShoppingCart, User, LogOut, Package } from 'lucide-react';
import { Button } from '@o4o/ui';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <Link to="/" className="text-2xl font-bold">
                O4O Shop
              </Link>
              <Link to="/products" className="hover:text-primary">
                상품
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              <Link to="/cart">
                <Button variant="ghost" size="icon">
                  <ShoppingCart className="h-5 w-5" />
                </Button>
              </Link>

              {user ? (
                <>
                  <Link to="/orders">
                    <Button variant="ghost" size="icon">
                      <Package className="h-5 w-5" />
                    </Button>
                  </Link>
                  <Link to="/profile">
                    <Button variant="ghost" size="icon">
                      <User className="h-5 w-5" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon" onClick={handleLogout}>
                    <LogOut className="h-5 w-5" />
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="ghost">로그인</Button>
                  </Link>
                  <Link to="/register">
                    <Button>회원가입</Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t mt-auto">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>&copy; 2025 O4O Platform. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}