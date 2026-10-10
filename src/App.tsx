import { observeMotion } from "@/lib/motion-visibility";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Zap,
  ChevronDown,
  Check,
  SlidersHorizontal,
} from "lucide-react";
import { Popover, Select } from "radix-ui";
import { api, groupsOf, useNodes } from "@/lib/api";
import { loadConfig } from "@/lib/config";
import { bytes, rate } from "@/lib/format";
import { MonitorCard } from "@/components/MonitorCard";
import { useSkinIcon } from "@/lib/skin-icon";
import { ValueCalculator } from "@/components/ValueCalculator";

type Me = {
  authed: boolean;
  site_name: string;
  public_page: boolean;
  history_days?: number;
  demo?: boolean;
};
const loadDetail = () =>
  import("@/components/NodeDetail").then((module) => ({
    default: module.NodeDetail,
  }));
const NodeDetail = lazy(loadDetail);
const variants = ["promo", "neon", "retro"];

function readPreference(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writePreference(key: string, value: string) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    /* Storage can be disabled. */
  }
}

function useNodeRoute() {
  const read = () => {
    const match = location.pathname.match(/^\/node\/(\d+)\/?$/);
    return match ? Number(match[1]) : null;
  };
  const [id, setId] = useState(read);
  useEffect(() => {
    const sync = () => setId(read());
    addEventListener("popstate", sync);
    return () => removeEventListener("popstate", sync);
  }, []);
  return [
    id,
    (next: number | null) => {
      const path = next === null ? "/" : `/node/${next}`;
      if (location.pathname !== path) history.pushState({}, "", path);
      setId(next);
      scrollTo(0, 0);
    },
  ] as const;
}

export default function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [meError, setMeError] = useState("");
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [preference, setPreference] = useState(() => {
    const saved = readPreference("guangao.variant");
    return saved && variants.includes(saved) ? saved : "";
  });
  const [motionStopped, setMotionStopped] = useState(
    () => readPreference("guangao.motion") === "off",
  );
  const [borderLightStopped, setBorderLightStopped] = useState(
    () => readPreference("guangao.borderlight") === "off",
  );
  const { nodes, error, closed } = useNodes();
  const [open, go] = useNodeRoute();
  const [group, setGroup] = useState<string | null>(null);
  const loadMe = useCallback(
    () =>
      api<Me>("/me")
        .then((data) => {
          setMe(data);
          setMeError("");
        })
        .catch((failure: Error) => setMeError(failure.message)),
    [],
  );

  useEffect(() => {
    void loadMe();
    void loadConfig().then(setConfig);
    void loadDetail();
  }, [loadMe]);
  useEffect(() => {
    if (closed) void loadMe();
  }, [closed, loadMe]);
  useEffect(() => {
    if (me && !me.public_page && !me.authed) location.href = "/admin/";
  }, [me]);

  const sorted = [...(nodes ?? [])].sort(
    (a, b) => a.sort - b.sort || a.id - b.id,
  );
  const selected = sorted.find((node) => node.id === open);
  const groups = groupsOf(sorted);
  const ungrouped = sorted.some((node) => !node.group);
  const current =
    group === null || (group === "" ? ungrouped : groups.includes(group))
      ? group
      : null;
  // Forget a removed group, so a later group with that name does not capture the view.
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    if (group !== current) setGroup(current);
  }, [group, current]);
  useEffect(() => {
    // oxlint-disable-next-line react/immutability -- This synchronizes the browser title, not React state.
    document.title = [selected?.name, me?.site_name || "广告探针"]
      .filter(Boolean)
      .join(" · ");
  }, [selected?.name, me?.site_name]);
  const shown =
    current === null
      ? sorted
      : sorted.filter((node) => (node.group ?? "") === current);
  const variant = preference || String(config?.variant || "promo");
  const siteIcon = useSkinIcon(variant);
  const motion = config?.motion !== false && !motionStopped;
  const loading = !nodes || !config;
  const online = shown.filter((node) => node.online).length;
  const live = shown.filter((node) => node.online && node.metrics);
  const rx = live.reduce((sum, node) => sum + node.metrics!.net_rx, 0);
  const tx = live.reduce((sum, node) => sum + node.metrics!.net_tx, 0);
  const download = !loading && live.length > 0 ? rate(rx) : "—";
  const upload = !loading && live.length > 0 ? rate(tx) : "—";
  const traffic = shown.reduce(
    (sum, node) =>
      sum +
      (Number.isFinite(node.total_rx) ? node.total_rx : 0) +
      (Number.isFinite(node.total_tx) ? node.total_tx : 0),
    0,
  );
  const demo = import.meta.env.DEV && me?.demo === true;

  if (!me)
    return (
      <div className="boot-screen">
        <span className="boot-stamp">正在接通</span>
        <h1>广告位加载中…</h1>
        {meError && (
          <>
            <p role="alert">{meError}</p>
            <button onClick={loadMe}>重新连接</button>
          </>
        )}
      </div>
    );
  if (!me.public_page && !me.authed) return null;

  return (
    <div
      className="monitor-app"
      data-variant={variant}
      data-motion={motion ? "on" : "off"}
      data-borderlight={borderLightStopped ? "off" : "on"}
    >
      <a className="skip-link" href="#main">
        跳到节点信息
      </a>
      <div className="top-tape">
        <span>全站实况 · 持续上报</span>
        <span>这里没有广告，只有你的服务器</span>
        <span>GUANGAO / MONITOR</span>
      </div>
      <header className="masthead">
        <button
          className="brand"
          onClick={() => go(null)}
          aria-label="返回广告墙"
        >
          <img src={siteIcon} alt="" width="44" height="44" />
          <span>
            <strong>{me.site_name || "广告探针"}</strong>
            <small>SERVER STATUS, LOUD & CLEAR.</small>
          </span>
        </button>
        <ValueCalculator nodes={sorted} variant={variant} />
        <a href="/admin/" className="admin-link">
          {me.authed ? "进入后台" : "站长入口"}
          <ArrowUpRight size={15} />
        </a>
        <Popover.Root>
          <Popover.Trigger className="appearance-trigger" aria-label="外观设置">
            <SlidersHorizontal size={16} /> 外观设置
          </Popover.Trigger>
          <Popover.Content
            className="visitor-controls appearance-panel"
            aria-label="外观设置"
            align="end"
            sideOffset={12}
            collisionPadding={16}
          >
            <strong className="appearance-title">广告墙 · 外观设置</strong>
            <label>
              换个广告皮肤
              <Select.Root
                value={preference || "site"}
                onValueChange={(value) => {
                  const next = value === "site" ? "" : value;
                  setPreference(next);
                  writePreference("guangao.variant", next);
                }}
              >
                <Select.Trigger
                  className="theme-select-trigger"
                  aria-label="广告墙风格"
                >
                  <Select.Value />
                  <Select.Icon>
                    <ChevronDown size={14} />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Content
                  className="theme-select-menu"
                  position="popper"
                  side="bottom"
                  align="end"
                  sideOffset={10}
                  collisionPadding={16}
                >
                  <Select.Viewport>
                    {[
                      ["site", "跟随站点"],
                      ["promo", "红黄促销墙"],
                      ["neon", "澳门皇家赌场风"],
                      ["retro", "复古 GIF 广告墙"],
                    ].map(([value, label]) => (
                      <Select.Item
                        key={value}
                        value={value}
                        className="theme-select-option"
                      >
                        <Select.ItemText>{label}</Select.ItemText>
                        <Select.ItemIndicator>
                          <Check size={14} />
                        </Select.ItemIndicator>
                      </Select.Item>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Root>
            </label>
            <button
              aria-pressed={motionStopped}
              onClick={() => {
                const next = !motionStopped;
                setMotionStopped(next);
                writePreference("guangao.motion", next ? "off" : "on");
              }}
            >
              {motionStopped ? "恢复动效" : "停止动效"}
            </button>
            <button
              aria-pressed={borderLightStopped}
              onClick={() => {
                const next = !borderLightStopped;
                setBorderLightStopped(next);
                writePreference("guangao.borderlight", next ? "off" : "on");
              }}
            >
              {borderLightStopped ? "开启边框灯" : "关闭边框灯"}
            </button>
            <small>仅影响当前浏览器</small>
          </Popover.Content>
        </Popover.Root>
      </header>
      {demo && <div className="demo-label">演示数据 · 非真实节点</div>}
      {Boolean(config?.notice) && (
        <p className="notice">{String(config?.notice)}</p>
      )}
      <main id="main" className="monitor-main">
        {(error || meError) && (
          <p role="alert" className="error-banner">
            数据暂未更新 · {error || meError}
          </p>
        )}
        {open !== null ? (
          <section className="node-detail">
            <div className="detail-strip">
              <span>节点资料 · 全部公开指标</span>
              <button onClick={() => go(null)}>
                <ArrowLeft size={16} /> 返回广告墙
              </button>
            </div>
            <div className="detail-body">
              {!nodes ? (
                <p>正在读取节点…</p>
              ) : selected ? (
                <>
                  {selected.public_remark && (
                    <p className="detail-remark">{selected.public_remark}</p>
                  )}
                  <Suspense fallback={<p>正在加载历史曲线…</p>}>
                    <NodeDetail
                      node={selected}
                      historyDays={me.history_days ?? 7}
                    />
                  </Suspense>
                </>
              ) : (
                <p className="empty-state">
                  节点不存在或未公开。
                  <button onClick={() => go(null)}>返回广告墙</button>
                </p>
              )}
            </div>
          </section>
        ) : (
          <>
            {groups.length > 0 && (
              <nav className="group-tabs" aria-label="节点分组">
                <span className="group-label">线路专区</span>
                <button
                  aria-pressed={current === null}
                  onClick={() => setGroup(null)}
                >
                  全部线路 <small>{sorted.length}</small>
                </button>
                {groups.map((name) => (
                  <button
                    key={`group:${name}`}
                    aria-pressed={current === name}
                    onClick={() => setGroup(name)}
                  >
                    {name}
                    <small>
                      {sorted.filter((node) => node.group === name).length}
                    </small>
                  </button>
                ))}
                {ungrouped && (
                  <button
                    aria-pressed={current === ""}
                    onClick={() => setGroup("")}
                  >
                    未分组
                    <small>{sorted.filter((node) => !node.group).length}</small>
                  </button>
                )}
              </nav>
            )}
            {config?.show_summary !== false && (
              <section
                ref={observeMotion}
                className="overview-panel"
                aria-label="节点汇总"
              >
                {variant === "neon" && (
                  <>
                    <span className="royal-sign" aria-hidden="true">♛ 澳门皇家 · ROYAL MACAU ♛</span>
                    <div className="royal-card-fan" aria-hidden="true">
                      {["♠", "♥", "♦"].map((suit) => (
                        <span className={`royal-playing-card ${suit === "♠" ? "is-black" : "is-red"}`} key={suit}>
                          <small>A<br />{suit}</small>
                          <b>{suit}</b>
                          <small>A<br />{suit}</small>
                        </span>
                      ))}
                    </div>
                  </>
                )}
                <div className="hero-copy">
                  <span className="eyebrow">
                    <Zap size={15} fill="currentColor" /> 服务器实时展销中心
                  </span>
                  <h1>{String(config?.headline || "好节点，不用找！")}</h1>
                  <p>
                    状态一眼看穿，流量明码标价。
                    <br />
                    <strong>每一块“广告”，都是一台真节点。</strong>
                  </p>
                  <a className="hero-button" href="#nodes">
                    马上围观 <ArrowUpRight size={20} />
                  </a>
                </div>
                <div className="hero-score">
                  <span className="score-kicker">当前专区 · 在线节点</span>
                  <div className="score-number">
                    <strong data-testid="online-count">
                      {loading ? "—" : online}
                    </strong>
                    <span>
                      /{" "}
                      <b data-testid="node-count">
                        {loading ? "—" : shown.length}
                      </b>
                    </span>
                  </div>
                  <div className="score-footer">
                    <span className="live-dot" />
                    {loading
                      ? "正在查询"
                      : online === shown.length && shown.length > 0
                        ? "全部在线 · 状态火热"
                        : shown.length
                          ? "在线状态 · 如实展示"
                          : "等待节点接入"}
                  </div>
                </div>
                <div className="hero-burst">
                  <span>真数据</span>
                  <strong>不掺水</strong>
                  <small>REAL METRICS</small>
                </div>
                <span className="hero-corner" aria-hidden="true">
                  ★ ★ ★
                </span>
              </section>
            )}
            <div
              ref={observeMotion}
              className="ticker"
              aria-label="专区实时汇总"
            >
              <span className="ticker-label">实时快报</span>
              <div className="ticker-window">
                <div className="ticker-track">
                  {[false, true].map((copy) => (
                    <div
                      className="ticker-group"
                      key={String(copy)}
                      aria-hidden={copy || undefined}
                    >
                      <span>
                        ↓ 已上报下载 <b>{download}</b>
                      </span>
                      <span>
                        ↑ 已上报上传 <b>{upload}</b>
                      </span>
                      <span>
                        累计流量 <b>{loading ? "—" : bytes(traffic)}</b>
                      </span>
                      <span>看着像广告？点开才知道！</span>
                    </div>
                  ))}
                </div>
              </div>
              <span className="ticker-end">LIVE ↗</span>
            </div>
            <div id="nodes" className="section-heading">
              <div>
                <span className="mini-label">NODE SELECTION / 节点精选</span>
                <h2>
                  每个节点，都有排面<span>★</span>
                </h2>
              </div>
              <span className="section-count">
                {current === null ? "全部线路" : current || "未分组"} ·{" "}
                {shown.length} 个节点
              </span>
            </div>
            {loading ? (
              <div className="empty-state">正在装填广告位…</div>
            ) : sorted.length === 0 ? (
              <div className="empty-state">
                <strong>广告位招租，节点待接入。</strong>
                <p>在后台接入节点后，这里会自动展示实时信息。</p>
                <a href="/admin/">进入后台 ↗</a>
              </div>
            ) : (
              <div className="node-grid">
                {shown.map((node, index) => (
                  <MonitorCard
                    key={node.id}
                    node={node}
                    index={index}
                    onOpen={go}
                  />
                ))}
              </div>
            )}
            <section ref={observeMotion} className="bottom-banner">
              <span className="bottom-star">✦</span>
              <div>
                <strong>广告做得够大，数据看得够清。</strong>
                <span>CPU · 内存 · 磁盘 · 流量 · 历史曲线，一站看全。</span>
              </div>
              <a href="/admin/">
                我的节点我做主 <ArrowUpRight size={20} />
              </a>
            </section>
          </>
        )}
      </main>
      {config?.show_float === true && open === null && !loading && (
        <aside className="speed-float" aria-label="当前专区网速">
          <div>
            即时网速 <Zap size={14} />
          </div>
          <strong>↓ {download}</strong>
          <span>↑ {upload}</span>
          <small>
            {current === null ? "全站合计" : current || "未分组"} ·{" "}
            {live.length > 0 ? "已上报指标合计" : "没有实时指标"}
          </small>
        </aside>
      )}
      <footer className="footer">
        <div>
          <strong>GUANGAO THEME</strong>
          <span>每个广告位，都是探针信息。Powered by Monitor.</span>
        </div>
      </footer>
    </div>
  );
}
