import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <p className="text-8xl font-black text-muted-foreground/20 tabular-nums leading-none select-none">
        404
      </p>
      <h1 className="text-xl font-semibold text-foreground mt-4">Page not found</h1>
      <p className="text-sm text-muted-foreground mt-2">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Button asChild className="mt-8">
        <Link to="/">Go Home</Link>
      </Button>
    </div>
  );
};

export default NotFound;
