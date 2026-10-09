import { useState } from "react";
import { appearanceFor } from "@/lib/card-appearance";
import { observeMotion } from "@/lib/motion-visibility";
import {
  ArrowUpRight,
  ArrowDown,
  ArrowUp,
  Flame,
  Cpu,
  Gift,
  Infinity as InfinityIcon,
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
      className={`resource-tile ${isHigh ? "is-high" : ""} ${isCritical ? "is-critical" : ""}`}
    >
      <div>
        {icon}
        <span>{label}</span>
        <strong>{value === null ? "" : `${value.toFixed(1)}%`}</strong>
      </div>
      {value === null ? (
        <div
          className="resource-display"
          role="meter"
          aria-label={`${label}使用率`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext="不可用"
        >
          <span className="unavailable">{label} 不可用</span>
        </div>
      ) : (
        <div
          className="resource-display"
          role="meter"
          aria-label={`${label}使用率`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.min(100, Math.max(0, value))}
          aria-valuetext={`${value.toFixed(1)}%`}
        >
          <div
            className="resource-circle-bg"
            aria-hidden="true"
            style={
              {
                "--value": Math.min(100, Math.max(0, value)),
              } as React.CSSProperties
            }
          />
          <div className="resource-mega-number">
            {value.toFixed(0)}
            <span className="resource-percent-sign">%</span>
          </div>
        </div>
      )}
      <small>{foot}</small>
    </div>
  );
}

export function MonitorCard({
  node,
  onOpen,
}: {
  node: Node;
  onOpen: (id: number) => void;
}) {
  const m = node.online ? node.metrics : null;
  const days =
    node.expires_in !== undefined
      ? node.expires_in
      : daysUntil(node.expires_at);
  const used = usage(node);
  const isFree = node.price === 0;
  const remaining =
    node.traffic_limit > 0 ? Math.max(0, node.traffic_limit - used) : null;
  const remainingPercent =
    node.traffic_limit > 0
      ? Math.max(0, 100 - percent(used, node.traffic_limit))
      : null;
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
  const [appearance] = useState(() => appearanceFor(node.id));
  const { tone, pattern, sticker, tilt, label } = appearance;
  const isHot =
    node.online && m && (m.cpu > 70 || percent(m.mem_used, m.mem_total) > 80);

  return (
    <article
      ref={observeMotion}
      className={`node-card tone-${tone} pattern-${pattern} sticker-${sticker} tilt-${tilt} ${!node.online ? "is-offline" : ""} ${isHot ? "is-hot" : ""}`}
      aria-label={node.name}
    >
      <div className="node-border-light" aria-hidden="true" />
      {isHot && (
        <span className="hot-badge" aria-label="高负载节点">
          <Flame size={16} fill="currentColor" />
          HOT
        </span>
      )}
      <div className="card-topline">
        <span>
          <Flame size={13} />
          {labels[label]}
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
        <div className={`offer-price ${isFree ? "is-free" : ""}`}>
          <small>
            {isFree
              ? "免费节点 / 零元领用"
              : `节点费用 / ${cycle(node.billing_cycle) || "周期未设置"}`}
          </small>
          <strong>
            {isFree ? (
              <>
                <Gift size={22} aria-hidden="true" /> FREE
              </>
            ) : node.price > 0 ? (
              money(node.price, node.currency)
            ) : (
              "未设置"
            )}
          </strong>
        </div>
        {days !== null && Number.isFinite(days) && (
          <div
            className={`expiry-ticket ${isFree ? "expiry-free" : ""} ${days < 0 ? "expired" : ""}`}
          >
            <span>
              {days < 0
                ? "到期提醒"
                : days === 0
                  ? "今天到期"
                  : isFree
                    ? "免费有效期"
                    : "距离到期"}
            </span>
            <strong>{days < 0 ? `已过期 ${-days} 天` : `${days} 天`}</strong>
          </div>
        )}
        {isFree && (days === null || !Number.isFinite(days)) && (
          <div className="expiry-ticket expiry-free expiry-open">
            <span>免费领用</span>
            <strong aria-label="未设置到期日期">
              <InfinityIcon size={20} aria-hidden="true" />
            </strong>
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
      <div className="network-deals">
        <div className={`traffic-row ${remaining === 0 ? "is-exhausted" : ""}`}>
          <div className="traffic-copy">
            <small>本期剩余流量</small>
            <strong>{remaining === null ? "不限量" : bytes(remaining)}</strong>
            <span>
              已用 {bytes(used)}
              {node.traffic_limit > 0 ? ` / ${bytes(node.traffic_limit)}` : ""}
            </span>
          </div>
          <div className="traffic-stamp">
            <b>
              {remainingPercent === null
                ? "∞"
                : `${remainingPercent.toFixed(0)}%`}
            </b>
            <span>
              {remaining === 0
                ? "额度用尽"
                : remaining === null
                  ? "不限额度"
                  : "余量在手"}
            </span>
          </div>
        </div>
        <div className="speed-row">
          <span className="speed-ticket speed-download">
            <small>
              <ArrowDown size={13} />
              下载实况
            </small>
            <strong>{m ? rate(m.net_rx) : "—"}</strong>
          </span>
          <span className="speed-ticket speed-upload">
            <small>
              <ArrowUp size={13} />
              上传实况
            </small>
            <strong>{m ? rate(m.net_tx) : "—"}</strong>
          </span>
        </div>
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
