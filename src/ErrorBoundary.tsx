import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Activity, AlertTriangle, RefreshCcw, ShieldCheck } from 'lucide-react';
import { SystemGuard } from './security/SystemGuard';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    SystemGuard.reportCrash(); // <--- Report the crash
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 font-mono">
            <div className="max-w-md w-full bg-zinc-900 border border-red-900/50 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-transparent"></div>

                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full bg-red-900/20 flex items-center justify-center border border-red-500/20 animate-pulse">
                        <AlertTriangle className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-red-500 tracking-tight">SYSTEM FAILURE</h1>
                        <p className="text-xs text-red-400/60 uppercase tracking-widest">CRITICAL ERROR DETECTED</p>
                    </div>
                </div>

                <div className="bg-black/50 rounded-lg p-4 mb-6 border border-zinc-800 overflow-auto max-h-48 custom-scrollbar">
                    <p className="text-red-400 text-xs font-bold mb-2">{this.state.error?.toString()}</p>
                    {this.state.errorInfo && (
                        <pre className="text-[10px] text-zinc-500 whitespace-pre-wrap">
                            {this.state.errorInfo.componentStack}
                        </pre>
                    )}
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => window.location.reload()}
                        className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 group"
                    >
                        <RefreshCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                        REBOOT
                    </button>
                    <button
                        onClick={() => window.location.href = '/SafeMode.html'}
                        className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-emerald-500 border border-emerald-500/30 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
                    >
                        <ShieldCheck className="w-4 h-4" />
                        SAFE MODE
                    </button>
                </div>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}
