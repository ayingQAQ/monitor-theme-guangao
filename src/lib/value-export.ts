export function valueMarkdown(rows: [string, string][]) {
  const escape = (text: string) => text.replace(/[\r\n]+/g, ' ').replace(/([\\|`*_<>])/g, '\\$1');
  return ['# VPS 剩余价值', '', '| 项目 | 内容 |', '| --- | --- |', ...rows.map(([label, value]) => `| ${escape(label)} | ${escape(value)} |`), '', '按剩余时间折算，未计手续费。'].join('\n');
}

/** Draw a local estimate ticket. Node details are never sent to an exporter. */
export async function downloadValueImage(rows: [string, string][], variant: string) {
  const palette = variant === 'neon'
    ? { paper: '#24101c', ink: '#ffe3a0', accent: '#f3cd68', stripe: '#741d36' }
    : variant === 'retro'
      ? { paper: '#fff', ink: '#111', accent: '#0039c9', stripe: '#ffed00' }
      : { paper: '#fff7df', ink: '#201809', accent: '#c62525', stripe: '#ffdd35' };
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('浏览器不支持图片导出');
  ctx.font = '24px "Microsoft YaHei", sans-serif';
  const lines = rows.flatMap(([label, value]) => {
    const chunks: string[] = [];
    let chunk = '';
    for (const char of value) {
      if (chunk && ctx.measureText(chunk + char).width > 555) { chunks.push(chunk); chunk = ''; }
      chunk += char;
    }
    chunks.push(chunk);
    return chunks.map((text, index) => [index === 0 ? label : '', text]);
  });
  canvas.width = 900;
  canvas.height = 220 + lines.length * 54;
  ctx.fillStyle = palette.paper; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = palette.accent; ctx.lineWidth = 6; ctx.strokeRect(12, 12, 876, canvas.height - 24);
  ctx.fillStyle = palette.accent; ctx.fillRect(24, 24, 852, 92);
  ctx.fillStyle = variant === 'neon' ? '#24101c' : '#fff';
  ctx.font = 'bold 38px "Microsoft YaHei", sans-serif';
  ctx.fillText(variant === 'neon' ? '♠ 皇家估值账单' : variant === 'retro' ? '> VALUE CALCULATOR' : '剩余价值 · 明码估值票', 48, 84);
  ctx.font = '24px "Microsoft YaHei", sans-serif';
  lines.forEach(([label, value], index) => {
    const y = 165 + index * 54;
    ctx.fillStyle = palette.ink; ctx.fillText(label, 48, y); ctx.fillText(value, 285, y);
    ctx.strokeStyle = palette.stripe; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(48, y + 16); ctx.lineTo(852, y + 16); ctx.stroke();
  });
  ctx.fillStyle = palette.ink; ctx.font = '18px "Microsoft YaHei", sans-serif';
  ctx.fillText('按剩余时间折算 · 未计手续费 · Guangao / Monitor', 48, canvas.height - 35);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('图片导出失败')), 'image/png'));
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = 'vps-remaining-value.png'; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
