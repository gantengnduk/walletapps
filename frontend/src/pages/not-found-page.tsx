import React from "react";
import { Link } from "react-router";
import { Button } from "../components/button";
import { Home } from "lucide-react";

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="rounded-full bg-slate-100 p-4 text-slate-500 mb-4">
        <span className="text-3xl font-extrabold">404</span>
      </div>
      <h1 className="text-2xl font-bold text-slate-900">Page Not Found</h1>
      <p className="mt-2 text-sm text-slate-500 max-w-md">
        The page you are looking for does not exist or has been moved to another location.
      </p>
      <div className="mt-6">
        <Link to="/">
          <Button variant="secondary" leftIcon={<Home className="h-4 w-4" />}>
            Back to Wallets
          </Button>
        </Link>
      </div>
    </div>
  );
};

