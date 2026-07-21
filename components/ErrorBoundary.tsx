import * as React from "react";
import { ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public readonly state: State = {
    hasError: false,
    errorMessage: "",
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, errorMessage: "" });
  };

  public render() {
    if (this.state.hasError) {
      const isAuthError = this.state.errorMessage.includes("useAuth");
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-900 p-6 text-center">
          <div className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-6">
            <AlertTriangle size={40} className="text-red-400" />
          </div>

          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
            {isAuthError ? "Session Expired" : "Something went wrong"}
          </h2>

          <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-6">
            {isAuthError
              ? "Your session could not be verified. Please log in again."
              : "An unexpected error occurred. You can try again or reload the app."}
          </p>

          {!isAuthError && (
            <p className="text-xs text-slate-400 mb-6 max-w-sm font-mono bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
              {this.state.errorMessage}
            </p>
          )}

          <div className="flex gap-3">
            {!isAuthError && (
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-3 px-6 rounded-xl transition-all active:scale-95"
              >
                <RefreshCw size={16} /> Try Again
              </button>
            )}
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all active:scale-95"
            >
              <RefreshCw size={16} /> {isAuthError ? "Login Again" : "Reload App"}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
