import {
  ArrowUpRight,
  ArrowDown,
  ArrowUp,
  Flame,
  Cpu,
  HardDrive,
  MemoryStick,
} from "lucide-react";
import type { Node } from "@/lib/api";
import {
  bytes,
  cycle,
  daysUntil,
  money,
  pair,
  percent,
  rate,
  sinceSeen,
  uptime,
} from "@/lib/format";
import { Country } from "./NodeCard";

function usage(node: Node) {
  if (typeof node.month_used === "number" && Number.isFinite(node.month_used))
    return node.month_used;
  const rx = Number.isFinite(node.month_rx) ? node.month_rx : 0;
  const tx = Number.isFinite(node.month_tx) ? node.month_tx : 0;
  return node.traffic_mode === "up"
    ? tx
    : node.traffic_mode === "down"
      ? rx
      : node.traffic_mode === "max"
        ? Math.max(rx, tx)
        : rx + tx;
}

function Resource({
  label,
  value,
  foot,
  icon,
}: {
  label: string;
  value: number | null;
  foot: string;
  icon: React.ReactNode;
}) {
  const isHigh = value !== null && value >= 80;
  const isCritical = value !== null && value >= 95;

  return (
    <div
      className={`ad-resource ${isHigh ? "is-high" : ""} ${isCritical ? "is-critical" : ""}`}
    >
      <div>
        {icon}
        <span>{label}</span>
        <strong>
          {value === null ? (
            <span className="unavailable">{label} 不可用</span>
          ) : (
            `${value.toFixed(1)}%`
          )}
        </strong>
      </div>
      <div
        className="resource-track"
        role="meter"
        aria-label={`${label}使用率`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value === null ? undefined : Math.min(100, value)}
        aria-valuetext={value === null ? "不可用" : `${value.toFixed(1)}%`}
      >
        <span
          style={{
            width: `${value === null ? 0 : Math.min(100, Math.max(0, value))}%`,
          }}
        />
      </div>
      <small>{foot}</small>
    </div>
  );
}

export function AdCard({
  node,
  index,
  onOpen,
}: {
  node: Node;
  index: number;
  onOpen: (id: number) => void;
}) {
  const m = node.online ? node.metrics : null;
  const days =
    node.expires_in !== undefined
      ? node.expires_in
      : daysUntil(node.expires_at);
  const used = usage(node);
  const down = sinceSeen(node);
  const neverSeen =
    node.last_seen_ago === null ||
    (node.last_seen_ago === undefined && !node.last_seen);
  const state = !node.online ? "暂时离线" : !m ? "等待首次上报" : "火热在线";
  const labels = [
    "直击现场",
    "人气节点",
    "全球精选",
    "负载实录",
    "状态追踪",
    "新鲜上架",
  ];
  const tone = index % 6;
  const isHot =
    node.online && m && (m.cpu > 70 || percent(m.mem_used, m.mem_total) > 80);

  return (
    <article
      className={`node-ad tone-${tone} ${!node.online ? "is-offline" : ""} ${isHot ? "is-hot" : ""}`}
      aria-label={node.name}
    >
      {isHot && (
        <span className="hot-badge" aria-label="高负载节点">
          <Flame size={16} fill="currentColor" />
          HOT
        </span>
      )}
      <div className="card-topline">
        <span>
          <Flame size={13} />
          {labels[tone]}
        </span>
        <span className={`status-tag ${m ? "is-live" : ""}`}>{state}</span>
      </div>
      <div className="card-title">
        <span className="node-id">NO.{String(node.id).padStart(2, "0")}</span>
        <Country node={node} />
        <h3 title={node.name}>{node.name}</h3>
        <span className="title-spark" aria-hidden="true">
          ✦
        </span>
      </div>
      <p className="card-remark">
        {node.public_remark ||
          (node.online
            ? "资源全公开，指标看得见"
            : "实时状态暂停，累计流量仍可查看")}
      </p>
      <div className="offer-row">
        <div className="offer-price">
          <small>节点费用 / {cycle(node.billing_cycle) || "周期未设置"}</small>
          <strong>
            {node.price > 0 ? money(node.price, node.currency) : "未设置"}
          </strong>
        </div>
        {days !== null && Number.isFinite(days) && (
          <div className={`expiry-ticket ${days < 0 ? "expired" : ""}`}>
            <span>
              {days < 0 ? "到期提醒" : days === 0 ? "今天到期" : "距离到期"}
            </span>
            <strong>{days < 0 ? `已过期 ${-days} 天` : `${days} 天`}</strong>
          </div>
        )}
      </div>
      <div className="spec-ribbon">
        <span>
          {node.cpu_cores > 0 ? `${node.cpu_cores} 核 CPU` : "配置待上报"}
        </span>
        <span>
          {node.mem_total > 0 ? `${bytes(node.mem_total)} 内存` : "内存未知"}
        </span>
        <span>
          {node.disk_total > 0 ? `${bytes(node.disk_total)} 磁盘` : "磁盘未知"}
        </span>
      </div>
      <div className="card-resources">
        <Resource
          label="CPU"
          value={m ? m.cpu : null}
          foot={
            m
              ? `负载 ${m.load.map((load) => load.toFixed(2)).join(" / ")}`
              : "实时指标暂停"
          }
          icon={<Cpu size={13} />}
        />
        <Resource
          label="内存"
          value={m ? percent(m.mem_used, m.mem_total) : null}
          foot={m ? pair(m.mem_used, m.mem_total) : "等待指标"}
          icon={<MemoryStick size={13} />}
        />
        <Resource
          label="磁盘"
          value={m ? percent(m.disk_used, m.disk_total) : null}
          foot={m ? pair(m.disk_used, m.disk_total) : "等待指标"}
          icon={<HardDrive size={13} />}
        />
      </div>
      <div className="traffic-row">
        <span>
          本期流量 <b>{bytes(used)}</b>
          {node.traffic_limit > 0
            ? ` / ${bytes(node.traffic_limit)}`
            : " / 不限量"}
        </span>
        {node.traffic_limit > 0 && (
          <span>{percent(used, node.traffic_limit).toFixed(1)}%</span>
        )}
      </div>
      <div className="speed-row">
        <span>
          <ArrowDown size={14} />
          <strong>{m ? rate(m.net_rx) : "—"}</strong>
        </span>
        <span>
          <ArrowUp size={14} />
          <strong>{m ? rate(m.net_tx) : "—"}</strong>
        </span>
      </div>
      <div className="card-foot">
        <small>
          {!node.online
            ? neverSeen
              ? "从未上报"
              : down === 0
                ? "刚刚离线"
                : down < 60
                  ? `离线 ${Math.floor(down)} 秒`
                  : `离线 ${uptime(down)}`
            : m
              ? `持续在线 ${uptime(m.uptime)}`
              : "连接已建立"}
        </small>
        <a
          href={`/node/${node.id}`}
          onClick={(event) => {
            if (
              event.button === 0 &&
              !event.ctrlKey &&
              !event.metaKey &&
              !event.shiftKey &&
              !event.altKey
            ) {
              event.preventDefault();
              onOpen(node.id);
            }
          }}
        >
          立即查看 <ArrowUpRight size={18} />
        </a>
      </div>
    </article>
  );
}
