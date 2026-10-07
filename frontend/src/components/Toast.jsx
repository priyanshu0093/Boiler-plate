import React from 'react';
import { useSocket } from '../context/SocketContext';
import { Info, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Toast() {
  const { toasts } = useSocket();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            className="toast-item"
            style={{
              borderLeft: isSuccess
                ? '3px solid #2E7D32'
                : isError
                ? '3px solid #B91C1C'
                : '3px solid #6B7280'
            }}
          >
            {isSuccess ? (
              <CheckCircle2 size={16} style={{ color: '#4ADE80', flexShrink: 0 }} />
            ) : isError ? (
              <AlertCircle size={16} style={{ color: '#F87171', flexShrink: 0 }} />
            ) : (
              <Info size={16} style={{ color: '#D1D5DB', flexShrink: 0 }} />
            )}
            <span>{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
}
