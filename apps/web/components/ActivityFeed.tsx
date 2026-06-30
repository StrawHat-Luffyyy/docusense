"use client";

import React from "react";
import { Upload, CheckCircle, Loader2, XCircle, Share2 } from "lucide-react";

interface ActivityItem {
  id: string;
  filename: string;
  action: string;
  status: string;
  timestamp: string;
  sizeBytes: number;
}

interface ActivityFeedProps {
  items: ActivityItem[];
}

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const ACTION_CONFIG: Record<
  string,
  { icon: React.ElementType; color: string; label: string }
> = {
  uploaded: {
    icon: Upload,
    color: "text-blue-400",
    label: "Uploaded",
  },
  indexed: {
    icon: CheckCircle,
    color: "text-success",
    label: "Indexed",
  },
  processing: {
    icon: Loader2,
    color: "text-warning",
    label: "Processing",
  },
  failed: {
    icon: XCircle,
    color: "text-destructive",
    label: "Failed",
  },
  shared: {
    icon: Share2,
    color: "text-primary",
    label: "Shared",
  },
};

export default function ActivityFeed({ items }: ActivityFeedProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className="px-3 py-3 border-t border-border">
      <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
        Recent Activity
      </h3>
      <div className="space-y-1 max-h-36 overflow-y-auto">
        {items.slice(0, 6).map((item) => {
          const config = ACTION_CONFIG[item.action] ?? ACTION_CONFIG.uploaded;
          const Icon = config.icon;
          return (
            <div
              key={`${item.id}-${item.action}`}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-background/40 transition-colors"
            >
              <Icon
                className={`w-3 h-3 shrink-0 ${config.color} ${item.action === "processing" ? "animate-spin" : ""}`}
              />
              <span className="text-[11px] text-foreground truncate flex-1">
                <span className="text-muted-foreground">{config.label}</span>{" "}
                {item.filename}
              </span>
              <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                {getRelativeTime(item.timestamp)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
