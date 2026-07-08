import * as React from "react"; // 👈 Changed import style for better compatibility
import { ErrorInfo, ReactNode } from "react";
import { LottiePlayer } from "./LottiePlayer";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

// 👇 Explicitly using React.Component with Generics <Props, State>
export class ErrorBoundary extends React.Component<Props, State> {
  
  // 👇 Explicitly defining state property
  public readonly state: State = {
    hasError: false
  };
    props: any;

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    // Safe check for state
    if (this.state && this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-900 p-6 text-center">
            <LottiePlayer type="404" className="w-64 h-64 mb-4" />
            
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
              Something went wrong.
            </h2>
            <p className="text-slate-500 mb-6">
              Please reload the app to fix this issue.
            </p>
            
            <button
              onClick={() => window.location.reload()}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all active:scale-95"
            >
              Reload App
            </button>
        </div>
      );
    }

    return this.props.children;
  }
}