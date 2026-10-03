import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "./Button";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in component tree:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            width: "100%",
            padding: "24px",
            backgroundColor: "var(--bg)",
            color: "var(--tx)",
            textAlign: "center",
            gap: "12px",
          }}
        >
          <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--del)" }}>
            {this.props.fallbackTitle || "Произошла непредвиденная ошибка интерфейса"}
          </div>
          <div
            className="mono"
            style={{
              fontSize: "12px",
              color: "var(--mut)",
              backgroundColor: "var(--bg2)",
              padding: "10px 16px",
              borderRadius: "var(--radius-base)",
              border: "1px solid var(--line)",
              maxWidth: "600px",
              overflowX: "auto",
              whiteSpace: "pre-wrap",
            }}
          >
            {this.state.error?.message || "Неизвестная ошибка"}
          </div>
          <Button variant="default" size="sm" onClick={this.handleReset}>
            Попробовать снова
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
