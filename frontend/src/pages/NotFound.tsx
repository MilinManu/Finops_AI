import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Home } from 'lucide-react';

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <h1 className="text-8xl font-black text-slate-800 tracking-widest font-mono">404</h1>
      <h2 className="text-xl font-bold text-slate-100 mt-2">Resource Endpoint Not Found</h2>
      <p className="text-xs text-slate-400 mt-1 max-w-sm">
        The requested FinOps console route does not exist or has been relocated.
      </p>
      <Link to="/dashboard" className="mt-6">
        <Button variant="primary" size="md" icon={Home}>
          Return to Dashboard
        </Button>
      </Link>
    </div>
  );
};
