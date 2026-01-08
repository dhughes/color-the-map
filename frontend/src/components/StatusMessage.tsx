interface StatusMessageProps {
  message: string;
  type: "info" | "success" | "error";
}

export function StatusMessage({ message, type }: StatusMessageProps) {
  return (
    <div className={`status-message status-${type}`}>
      <div className="status-dot" />
      <span>{message}</span>
    </div>
  );
}
