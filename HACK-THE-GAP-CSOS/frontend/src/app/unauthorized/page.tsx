import { ShieldAlert, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center bg-black/60 backdrop-blur-md border border-red-500/30 rounded-lg p-10 max-w-md"
           style={{ boxShadow: '0 0 30px rgba(239,68,68,0.2)' }}>
        <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold font-mono tracking-widest text-red-500 mb-2">
          ACCESS DENIED
        </h1>
        <p className="text-xs font-mono text-slate-500 tracking-wider mb-6">
          [SYS] ZERO-TRUST PROTOCOL VIOLATED<br />
          INSUFFICIENT CLEARANCE FOR REQUESTED SECTOR
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded text-xs font-mono font-bold tracking-wider border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all duration-200"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          RETURN TO BASE
        </Link>
      </div>
    </div>
  );
}
