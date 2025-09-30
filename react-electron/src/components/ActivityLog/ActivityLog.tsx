/**
 * Activity Log Component
 * React component for displaying application logs and activity
 */

import React, { useState, useEffect, useRef, ReactNode } from "react";
import { LogEntry, LOG_LEVELS } from "../../types";
import "./ActivityLog.css";

interface ActivityLogProps {
  logs?: LogEntry[];
  maxEntries?: number;
  autoScroll?: boolean;
}

export const ActivityLog: React.FC<ActivityLogProps> = ({
  logs = [],
  maxEntries = 100,
  autoScroll = true,
}) => {
  const [displayLogs, setDisplayLogs] = useState<LogEntry[]>(logs);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const logIdCounter = useRef<number>(0);

  useEffect(() => {
    setDisplayLogs(logs.slice(-maxEntries));
  }, [logs, maxEntries]);

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [displayLogs, autoScroll]);

  const addLog = (
    message: string,
    level: "info" | "success" | "error" | "warning" = "info",
    details?: any
  ) => {
    const newLog: LogEntry = {
      id: `log-${++logIdCounter.current}`,
      timestamp: Date.now(),
      level,
      message,
      details,
    };

    setDisplayLogs((prev) => {
      const updated = [...prev, newLog];
      return updated.slice(-maxEntries);
    });

    // Also log to console
    const timestamp = new Date(newLog.timestamp).toLocaleTimeString();
    const prefix = `[${timestamp}]`;

    switch (level) {
      case "error":
        console.error(prefix, message, details || "");
        break;
      case "warning":
        console.warn(prefix, message, details || "");
        break;
      case "success":
      case "info":
      default:
        console.log(prefix, message, details || "");
        break;
    }
  };

  const clearLogs = () => {
    setDisplayLogs([]);
  };

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getLogIcon = (level: string): string => {
    switch (level) {
      case LOG_LEVELS.SUCCESS:
        return "✅";
      case LOG_LEVELS.ERROR:
        return "❌";
      case LOG_LEVELS.WARNING:
        return "⚠️";
      case LOG_LEVELS.INFO:
      default:
        return "ℹ️";
    }
  };

  // Expose addLog function globally for legacy compatibility
  useEffect(() => {
    (window as any).log = addLog;

    return () => {
      delete (window as any).log;
    };
  }, []);

  return (
    <div className="activity-log">
      <div className="log-header">
        <h3>📋 Activity Log</h3>
        <div className="log-controls">
          <button
            className="clear-button"
            onClick={clearLogs}
            title="Clear logs"
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      <div className="log-container" ref={logContainerRef}>
        {displayLogs.length === 0 ? (
          <div className="log-empty">
            <span>No logs available</span>
          </div>
        ) : (
          displayLogs.map((log) => (
            <div key={log.id} className={`log-entry ${log.level}`}>
              <span className="log-timestamp">
                {formatTimestamp(log.timestamp)}
              </span>
              <span className="log-icon">{getLogIcon(log.level)}</span>
              <span className="log-message">{log.message}</span>
            </div>
          ))
        )}
      </div>

      <div className="log-footer">
        <small>
          {displayLogs.length} {displayLogs.length === 1 ? "entry" : "entries"}
          {maxEntries &&
            displayLogs.length >= maxEntries &&
            ` (showing last ${maxEntries})`}
        </small>
      </div>
    </div>
  );
};

// Component is already exported above

// Create a global log context for sharing logs across components
export const useActivityLog = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = (
    message: string,
    level: "info" | "success" | "error" | "warning" = "info",
    details?: any
  ) => {
    const newLog: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      level,
      message,
      details,
    };

    setLogs((prev) => [...prev, newLog]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return {
    logs,
    addLog,
    clearLogs,
  };
};
