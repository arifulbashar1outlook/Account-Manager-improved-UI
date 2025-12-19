
import React, { useState, useEffect } from 'react';
import { 
  Save, 
  AlertCircle, 
  X, 
  FileSpreadsheet, 
  Copy, 
  CheckCircle2, 
  CloudDownload, 
  RefreshCw, 
  ArrowLeft, 
  ShieldCheck, 
  Link2, 
  ChevronRight,
  Database,
  Unlink,
  Code
} from 'lucide-react';
import { getSyncConfig, saveSyncConfig, clearSyncConfig, GOOGLE_APPS_SCRIPT_CODE } from '../services/syncService';

interface SyncViewProps {
  onBack: () => void;
  onPullData?: () => Promise<void>;
}

const SyncView: React.FC<SyncViewProps> = ({ onBack, onPullData }) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const config = getSyncConfig();

  useEffect(() => {
    if (config) {
        setUrl(config.url);
    }
  }, []);

  const handleSave = () => {
    setError('');
    if (!url.trim()) {
        setError("URL cannot be empty");
        return;
    }
    if (!url.startsWith('https://script.google.com')) {
        setError("Invalid URL. Must be a Google Apps Script Web App URL.");
        return;
    }

    saveSyncConfig({ url: url.trim() });
    window.location.reload(); 
  };

  const handleDisconnect = () => {
      if (confirm("Disconnecting will stop cloud synchronization. Your local data remains safe. Proceed?")) {
          clearSyncConfig();
          window.location.reload();
      }
  };

  const handleManualPull = async () => {
      if (!onPullData) return;
      setIsPulling(true);
      try {
          await onPullData();
      } catch (e) {
          setError("Failed to pull data. Check your script URL and permissions.");
      } finally {
          setIsPulling(false);
      }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-md-surface dark:bg-zinc-950 pb-32 animate-in fade-in duration-300">
      <div className="px-6 space-y-6">
          <div className="flex items-center gap-3 pt-4 pb-2">
              <FileSpreadsheet className="text-md-primary" size={24} />
              <h2 className="text-3xl font-black tracking-tight text-md-on-surface">Cloud Sync</h2>
          </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Status Card */}
        <div className={`p-6 rounded-[32px] border shadow-sm transition-all ${config ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-800/30' : 'bg-amber-50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-800/30'}`}>
            <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-2xl ${config ? 'bg-emerald-500' : 'bg-amber-500'} text-white shadow-md`}>
                     {config ? <CheckCircle2 size={22} /> : <AlertCircle size={22} />}
                  </div>
                  <div>
                    <h3 className={`font-black text-sm tracking-tight ${config ? 'text-emerald-900 dark:text-emerald-400' : 'text-amber-900 dark:text-amber-400'}`}>
                        {config ? 'Cloud Link Active' : 'Not Connected'}
                    </h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                        {config?.lastSynced ? `Last Synced: ${new Date(config.lastSynced).toLocaleTimeString()}` : 'No sync records'}
                    </p>
                  </div>
               </div>
               {config && (
                   <button 
                     onClick={handleDisconnect}
                     className="p-2 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-full transition-colors"
                     title="Disconnect"
                   >
                     <Unlink size={18} />
                   </button>
               )}
            </div>
            
            {config && (
                <button
                    onClick={handleManualPull}
                    disabled={isPulling}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                    {isPulling ? <RefreshCw className="animate-spin w-4 h-4" /> : <CloudDownload className="w-4 h-4" />}
                    {isPulling ? 'Syncing...' : 'Sync Now (Force Pull)'}
                </button>
            )}
        </div>

        {/* Setup Guide */}
        <div className="space-y-4">
             <div className="flex items-center gap-2 ml-2">
                <Database size={14} className="text-md-primary" />
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-md-on-surface-variant">Setup Instructions</h3>
            </div>

            {/* Step 1 Card */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-[32px] border border-gray-100 dark:border-zinc-800 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-md-primary text-white flex items-center justify-center text-xs font-black">1</div>
                    <h4 className="font-black text-xs uppercase tracking-widest text-md-on-surface">Deploy Apps Script</h4>
                </div>
                <p className="text-xs text-md-on-surface-variant leading-relaxed">
                    Open your Google Sheet, go to <b>Extensions &gt; Apps Script</b>, then click the box below to copy the code.
                </p>
                
                <div 
                    onClick={copyCode}
                    className={`relative p-8 rounded-[24px] border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-3 active:scale-95 ${
                        copied 
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-900/10 dark:border-emerald-500 dark:text-emerald-400' 
                        : 'bg-md-primary/5 border-md-primary/30 text-md-primary hover:bg-md-primary/10 dark:bg-zinc-800 dark:border-zinc-700'
                    }`}
                >
                    {copied ? (
                      <CheckCircle2 size={40} className="animate-in zoom-in duration-300" />
                    ) : (
                      <Code size={40} className="opacity-60" />
                    )}
                    <div className="text-center">
                        <p className="font-black text-xs uppercase tracking-[0.15em]">{copied ? 'Code Copied!' : 'Copy Sync Script'}</p>
                        <p className="text-[10px] opacity-60 font-bold uppercase tracking-tight mt-1">
                            {copied ? 'Paste into your script editor' : 'Click to copy to clipboard'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Step 2 Card */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-[32px] border border-gray-100 dark:border-zinc-800 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-md-primary text-white flex items-center justify-center text-xs font-black">2</div>
                    <h4 className="font-black text-xs uppercase tracking-widest text-md-on-surface">Connect Endpoint</h4>
                </div>
                <div className="space-y-3">
                    <div className="relative">
                        <Link2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-md-primary opacity-50" />
                        <input 
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://script.google.com/macros/s/..."
                            className="w-full pl-11 pr-4 py-4 bg-md-surface-container dark:bg-zinc-800 border-none rounded-2xl outline-none text-sm font-black focus:ring-2 focus:ring-md-primary/20 shadow-inner dark:text-white"
                        />
                    </div>
                    
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-xl text-[10px] font-black uppercase">
                            <AlertCircle size={14} />
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleSave}
                        className="w-full py-4 bg-md-primary text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                    >
                        <Save size={18} />
                        Save & Connect
                    </button>
                </div>
            </div>
        </div>

        {/* Security Info */}
        <div className="flex items-start gap-3 p-4 bg-md-surface-container-high dark:bg-zinc-800/50 rounded-2xl border border-gray-100 dark:border-zinc-800">
            <ShieldCheck className="w-5 h-5 text-md-primary shrink-0 mt-0.5" />
            <p className="text-[10px] font-bold text-md-on-surface-variant leading-relaxed uppercase tracking-wider">
                Privacy Note: Your financial data is sent directly to your own Google Sheet. No third-party servers see your data.
            </p>
        </div>
      </div>
    </div>
  );
};

export default SyncView;
