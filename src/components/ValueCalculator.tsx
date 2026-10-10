import { useEffect, useRef, useState } from 'react';
import { Dialog, Select } from 'radix-ui';
import { Calculator, Check, ChevronDown, Copy, Download, RotateCcw, X } from 'lucide-react';
import type { Node } from '@/lib/api';
import { bytes, money } from '@/lib/format';
import { billingDays, dateDays, premium, remainingValue } from '@/lib/remaining-value';
import { downloadValueImage, valueMarkdown } from '@/lib/value-export';

const currencies = ['CNY', 'USD', 'EUR', 'GBP', 'HKD', 'JPY', 'CAD', 'AUD', 'SGD', 'CHF'];
const cycles = [['monthly', '月付 · 30 天'], ['quarterly', '季付 · 90 天'], ['semiannual', '半年付 · 180 天'], ['yearly', '年付 · 365 天'], ['biennial', '两年付 · 730 天'], ['triennial', '三年付 · 1095 天'], ['custom', '自定义周期']];
const specs = [['vendor', 'VPS 商家'], ['product', '产品名称'], ['feature', '产品特色'], ['cpu', 'CPU'], ['memory', '内存'], ['storage', '存储'], ['bandwidth', '带宽'], ['traffic', '流量限制'], ['location', '机房位置']];
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const initial = () => ({ amount: '', currency: 'CNY', rate: '1', cycle: 'yearly', days: '365', expires: '', trade: today(), sale: '' });
const number = (value: string) => value.trim() === '' ? NaN : Number(value);

function Choice({ label, value, options, onChange }: { label: string; value: string; options: string[][]; onChange: (value: string) => void }) {
  return <label className="calc-field"><span>{label}</span>
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger className="theme-select-trigger" aria-label={label}><Select.Value /><Select.Icon><ChevronDown size={15} /></Select.Icon></Select.Trigger>
      <Select.Content className="theme-select-menu calc-select-menu" position="popper" sideOffset={5} collisionPadding={16}>
        <Select.Viewport>{options.map(([key, name]) => <Select.Item key={key} value={key} className="theme-select-option"><Select.ItemText>{name}</Select.ItemText><Select.ItemIndicator><Check size={14} /></Select.ItemIndicator></Select.Item>)}</Select.Viewport>
      </Select.Content>
    </Select.Root>
  </label>;
}

export function ValueCalculator({ nodes, variant }: { nodes: Node[]; variant: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  const [nodeId, setNodeId] = useState('manual');
  const [config, setConfig] = useState<Record<string, string>>({});
  const [reference, setReference] = useState<{ currency: string; rate: number; date: string } | null>(null);
  const [rateStatus, setRateStatus] = useState('');
  const [feedback, setFeedback] = useState('');
  const [showMarkdown, setShowMarkdown] = useState(false);
  const rateEdited = useRef(false);
  const update = (key: keyof typeof form, value: string) => setForm(previous => ({ ...previous, [key]: value }));

  useEffect(() => {
    if (!open || form.currency === 'CNY') return;
    const controller = new AbortController();
    let cancelled = false;
    const timer = setTimeout(() => controller.abort(), 7000);
    // Query only the currency pair, never the user's node or form information.
    void fetch(`https://api.frankfurter.dev/v2/rate/${form.currency.toLowerCase()}/cny`, { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer' })
      .then(async response => {
        if (!response.ok) throw new Error('汇率不可用');
        const data = await response.json();
        if (!Number.isFinite(data.rate) || data.rate <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) throw new Error('汇率数据不完整');
        if (controller.signal.aborted) return;
        setReference({ currency: form.currency, rate: data.rate, date: data.date });
        setRateStatus('');
        if (!rateEdited.current) setForm(previous => ({ ...previous, rate: String(data.rate) }));
      })
      .catch(() => { if (!cancelled) setRateStatus('参考汇率暂不可用，请手动填写'); })
      .finally(() => clearTimeout(timer));
    return () => { cancelled = true; clearTimeout(timer); controller.abort(); };
  }, [open, form.currency]);

  const selectCurrency = (currency: string) => {
    rateEdited.current = false; setReference(null); setRateStatus(currency === 'CNY' ? '' : '正在查询参考汇率…');
    setForm(previous => ({ ...previous, currency, rate: currency === 'CNY' ? '1' : '' }));
  };
  const selectNode = (id: string) => {
    setNodeId(id); setFeedback('');
    const node = nodes.find(item => String(item.id) === id);
    if (!node) return;
    const days = billingDays(node.billing_cycle);
    const currency = /^[A-Z]{3}$/.test(node.currency) ? node.currency : 'CNY';
    if (currency !== form.currency) {
      rateEdited.current = false; setReference(null); setRateStatus(currency === 'CNY' ? '' : '正在查询参考汇率…');
    }
    setForm(previous => ({ ...previous, amount: String(Math.max(0, node.price)), currency, rate: currency === 'CNY' ? '1' : currency === previous.currency ? previous.rate : '', cycle: cycles.some(([key]) => key === node.billing_cycle) ? node.billing_cycle : 'custom', days: days === null ? '' : String(days), expires: node.expires_at?.slice(0, 10) || '' }));
    setConfig({ product: node.name, cpu: node.cpu_cores > 0 ? `${node.cpu_cores} 核` : '', memory: node.mem_total > 0 ? bytes(node.mem_total) : '', storage: node.disk_total > 0 ? bytes(node.disk_total) : '', traffic: node.traffic_limit > 0 ? bytes(node.traffic_limit) : '不限量', location: node.country });
  };
  const remaining = dateDays(form.trade, form.expires);
  const amount = number(form.amount), rate = number(form.rate), period = number(form.days);
  const value = remaining === null || !Number.isFinite(rate) || rate <= 0 ? null : remainingValue(amount * rate, period, remaining);
  const sale = number(form.sale);
  const markup = value === null || form.sale.trim() === '' ? null : premium(sale, value);
  const rows: [string, string][] = [
    ['交易日期', form.trade], ['到期日期', form.expires], ['续费价格', Number.isFinite(amount) ? money(amount, form.currency) : '—'],
    ['外币汇率', `1 ${form.currency} = ${form.rate} CNY`], ['付款周期', `${form.days} 天`], ['剩余天数', `${Math.max(0, remaining ?? 0)} 天`],
    ...specs.filter(([key]) => config[key]?.trim()).map(([key, label]): [string, string] => [label, config[key]]),
    ['剩余价值', value === null ? '—' : money(value, 'CNY')],
    ...(markup ? [['售价', money(sale, 'CNY')], ['溢价', `${money(markup.amount, 'CNY')} / ${markup.percent === null ? '基数为零，不计算溢价率' : `${markup.percent.toFixed(1)}%`}`]] as [string, string][] : []),
    ['折算说明', '月付按30天，年付按365天，可改周期天数；超出一周期封顶，未计手续费'],
  ];
  const markdown = valueMarkdown(rows);
  const copy = async () => {
    setShowMarkdown(true);
    try { await navigator.clipboard.writeText(markdown); setFeedback('Markdown 已复制'); }
    catch { setFeedback('可在下方手动复制 Markdown'); }
  };

  return <Dialog.Root open={open} onOpenChange={setOpen}>
    <Dialog.Trigger className="value-trigger" aria-label="剩余价值计算器"><Calculator size={18} /><span>剩余价值</span></Dialog.Trigger>
    <Dialog.Overlay className="value-overlay" />
    <Dialog.Content className="value-calculator">
      <div className="calc-heading"><span className="calc-emblem" aria-hidden="true"><Calculator size={28} /></span><div><small>VALUE / 明码估值</small><Dialog.Title>剩余价值计算器</Dialog.Title></div><Dialog.Close className="calc-close" aria-label="关闭计算器"><X size={20} /></Dialog.Close></div>
      <Dialog.Description className="calc-description">算清剩余时间，也算清这笔溢价。</Dialog.Description>
      <div className="calc-layout">
        <div className="calc-form">
          <Choice label="选择节点" value={nodeId === 'manual' || nodes.some(node => String(node.id) === nodeId) ? nodeId : 'manual'} options={[["manual", "手动填写"], ...nodes.map(node => [String(node.id), node.name])]} onChange={selectNode} />
          <div className="calc-fields">
            <label className="calc-field"><span>续费金额</span><input aria-label="续费金额" type="number" min="0" step="any" value={form.amount} onChange={event => update('amount', event.target.value)} placeholder="例如 200" /></label>
            <Choice label="货币" value={form.currency} options={Array.from(new Set([...currencies, form.currency])).map(currency => [currency, currency])} onChange={selectCurrency} />
            <label className="calc-field calc-wide"><span>外币汇率 · 1 {form.currency} 折合人民币</span><input aria-label="外币汇率" type="number" min="0" step="any" value={form.rate} readOnly={form.currency === 'CNY'} onChange={event => { rateEdited.current = true; update('rate', event.target.value); }} /></label>
          </div>
          <p className="calc-rate-note">{form.currency === 'CNY' ? '人民币汇率为 1' : reference?.currency === form.currency ? <>参考 {reference.rate} · {reference.date} · <a href="https://frankfurter.dev/" target="_blank" rel="noreferrer">Frankfurter</a></> : rateStatus || '可手动填写实际汇率'}</p>
          <div className="calc-fields">
            <Choice label="付款周期" value={form.cycle} options={cycles} onChange={cycle => setForm(previous => ({ ...previous, cycle, days: cycle === 'custom' ? previous.days : String(billingDays(cycle)) }))} />
            <label className="calc-field"><span>周期天数</span><input aria-label="周期天数" type="number" min="1" step="1" value={form.days} onChange={event => setForm(previous => ({ ...previous, cycle: 'custom', days: event.target.value }))} /></label>
            <label className="calc-field"><span>到期时间</span><input aria-label="到期时间" type="date" value={form.expires} onChange={event => update('expires', event.target.value)} /></label>
            <label className="calc-field"><span>交易日期</span><input aria-label="交易日期" type="date" value={form.trade} onChange={event => update('trade', event.target.value)} /></label>
            <label className="calc-field calc-wide"><span>售价（人民币，可选）</span><input aria-label="售价" type="number" min="0" step="any" value={form.sale} onChange={event => update('sale', event.target.value)} placeholder="填入售价，一起算溢价" /></label>
          </div>
          <details className="calc-specs"><summary>配置备注 · 可选</summary><div className="calc-fields">{specs.map(([key, label]) => <label className="calc-field" key={key}><span>{label}</span><input aria-label={label} maxLength={key === 'feature' ? 20 : 80} value={config[key] || ''} onChange={event => setConfig(previous => ({ ...previous, [key]: event.target.value }))} /></label>)}</div></details>
        </div>
        <div className="calc-receipt">
          <small className="calc-result-label">剩余价值 · 人民币</small>
          <output aria-live="polite">{value === null ? '—' : money(value, 'CNY')}</output>
          <div className="calc-result-facts"><span>剩余时间 <b>{remaining === null ? '待填写' : `${Math.max(0, remaining)} 天`}</b></span><span>付款周期 <b>{Number.isFinite(period) && period > 0 ? `${period} 天` : '待填写'}</b></span></div>
          {markup && <div className="calc-premium"><span>售价 {money(sale, 'CNY')}</span><strong>{markup.amount < 0 ? '折价' : '溢价'} {money(Math.abs(markup.amount), 'CNY')}</strong><small>{markup.percent === null ? '剩余价值为零，不计算溢价率' : `${markup.percent.toFixed(1)}%`}</small></div>}
          {value === null && <p>填好费用、汇率、日期与周期，结果即刻更新。</p>}
          {form.sale !== '' && (!Number.isFinite(sale) || sale < 0) && <p role="alert">售价须为非负数。</p>}
          <p className="calc-method">费用 × 汇率 × 剩余天数 ÷ 周期天数。月付按 30 天，年付按 365 天，可调整周期天数。</p>
          {remaining !== null && remaining > period && <p>剩余时间超过一个周期，按一个周期封顶。</p>}
          <p className="calc-footnote">仅按时间折算，未计手续费。表单与导出在本地处理。</p>
          <div className="calc-actions"><button disabled={value === null} onClick={() => void downloadValueImage(rows, variant).catch(() => setFeedback('图片导出失败，请使用 Markdown'))}><Download size={15} />下载图片</button><button disabled={value === null} onClick={() => void copy()}><Copy size={15} />复制 Markdown</button></div>
          <button className="calc-reset" onClick={() => { setForm(initial()); setNodeId('manual'); setConfig({}); setReference(null); setRateStatus(''); setFeedback(''); setShowMarkdown(false); rateEdited.current = false; }}><RotateCcw size={14} />重置表单</button>
          <p role="status" className="calc-feedback">{feedback}</p>
        </div>
      </div>
      {showMarkdown && <textarea className="calc-markdown" aria-label="Markdown 结果" readOnly value={markdown} />}
    </Dialog.Content>
  </Dialog.Root>;
}
