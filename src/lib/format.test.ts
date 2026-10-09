// Every figure on the page passes through this file, making it the one place
// worth a check. Run it with `npm test`: Node strips the types itself, so this
// requires no runner, framework or dependency.
//
// Nothing imports it, so the bundle never includes it.
import {
  axisBytes, axisTop, bytes, cpuName, cycle, daysUntil, despike, money, osName, pair, percent, quarters,
  RATE_FLOOR, rateAxis, sinceSeen, tickClock, timeTicks, uptime, windows, withGaps,
} from "./format.ts"

let failed = 0
function eq(got: unknown, want: unknown, what: string) {
  const [a, b] = [JSON.stringify(got), JSON.stringify(want)]
  if (a !== b) {
    failed++
    console.error(`✗ ${what}\n    得到 ${a}\n    期望 ${b}`)
  }
}

// bytes: the significant-digit ladder, and the sub-byte case that would
// otherwise print "512 undefined".
eq(bytes(0), "0 B", "bytes(0)")
eq(bytes(0.5), "0 B", "bytes(0.5) 不能落到 UNITS[-1]")
eq(bytes(-1), "0 B", "bytes(负数)")
eq(bytes(1023), "1023 B", "bytes 在 B 档不带小数")
eq(bytes(1024), "1.00 KB", "bytes(1 KiB)")
eq(bytes(10 * 1024), "10.0 KB", "两位数留一位小数")
eq(bytes(100 * 1024), "100 KB", "三位数不留小数")
eq(bytes(1024, 1), "1.0 KB", "digits 覆盖默认档位")

// pair: one unit when both sides share it, two when they do not.
eq(pair(300 * 1024 ** 2, 900 * 1024 ** 2), "300.00 / 900.00 MB", "同单位只写一次")
eq(pair(300 * 1024 ** 2, 3 * 1024 ** 3), "300 MB / 3.00 GB", "跨单位各写各的")

// axisBytes: ticks under three digits keep one decimal, or a narrow axis repeats
// a label; a trailing .0 adds nothing.
eq(axisBytes(3.2 * 1024 ** 3), "3.2 GB", "窄轴刻度保留一位")
eq(axisBytes(2 * 1024 ** 3), "2 GB", "整数刻度不写 .0")
eq(axisBytes(0), "0 B", "零刻度")

// axisTop: the top is derived from a round gridline, so quarters() lands on round
// values.
eq(axisTop(0.4, 4, 100), 4, "闲置机器拿到地板值")
eq(axisTop(63, 4, 100), 80, "63% -> 0/20/40/60/80")
eq(axisTop(200, 4, 100), 100, "百分比封顶")
eq(quarters(32 * 1024 ** 2).map(axisBytes), ["0 B", "8 MB", "16 MB", "24 MB", "32 MB"], "四条网格线都是整值")

// percent: a plan used past its quota keeps its figure.
eq(percent(3, 2), 150, "超额不封顶")
eq(percent(1, 0), 0, "没有总量时为 0")

// withGaps: an empty row in a gap over twice the usual spacing, none for one
// missed bucket or a slower agent's regular spacing. Empty rows show negated.
const gapped = (list: number[]) => withGaps(list.map((ts) => ({ ts, v: 1 }))).map((r) => ("v" in r ? r.ts : -r.ts))
eq(gapped([0, 60, 120, 180, 600, 660]), [0, 60, 120, 180, -390, 600, 660], "离线的一段断开")
eq(gapped([0, 60, 180, 240]), [0, 60, 180, 240], "缺一个桶不断开")
eq(gapped([0, 300, 600, 900, 1200]), [0, 300, 600, 900, 1200], "五分钟上报一次的 agent 照常连线")
eq(gapped([0, 60, 300, 600, 900, 1200]), [0, 60, 300, 600, 900, 1200], "间隔不齐时按中位数而非最小值")
eq(gapped([0, 60, 660]), [0, 60, -360, 660], "两段间隔时较短的一段是常规间隔")
eq(gapped([0]), [0], "单点")
eq(gapped([]), [], "空")

// rateAxis: from the rung at or below the slowest rate to the rung at or above
// the highest peak, every label round, at most six of them.
const axis = (low: number, high: number) => {
  const { domain, ticks } = rateAxis(low, high)
  return [domain.map(axisBytes), ticks.map(axisBytes)]
}
eq(axis(209, 70 * 1024 ** 2), [["1 KB", "100 MB"], ["1 KB", "10 KB", "100 KB", "1 MB", "10 MB", "100 MB"]],
   "空闲 209 B/s 落在标了的底上，突发 70 MB/s")
eq(axis(744, 229 * 1024 ** 2), [["1 KB", "1 GB"], ["1 KB", "100 KB", "10 MB", "1 GB"]], "七档隔一档标")
eq(axis(300, 1.5 * 1024 ** 3), [["1 KB", "10 GB"], ["10 KB", "1 MB", "100 MB", "10 GB"]], "八档从顶往下数")
eq(axis(5 * 1024 ** 2, 80 * 1024 ** 2), [["1 MB", "100 MB"], ["1 MB", "10 MB", "100 MB"]], "底随最慢的速率上移")
eq(axis(1100, 5100), [["1 KB", "10 KB"], ["1 KB", "10 KB"]], "不到一档时也有一档")
eq(axis(1024, 1024), [["1 KB", "10 KB"], ["1 KB", "10 KB"]], "正好落在档上")
eq(axis(0, 0), [["1 KB", "10 KB"], ["1 KB", "10 KB"]], "全是零")
eq(axis(Infinity, 0), [["1 KB", "10 KB"], ["1 KB", "10 KB"]], "空窗口：最小值的初值是 Infinity")
eq(RATE_FLOOR, 1024, "底是 1 KB/s")

// timeTicks: round clock values, phased on local midnight rather than the epoch,
// and never more than requested.
{
  const day = 86_400_000
  const to = Date.now()
  const ticks = timeTicks(to - day, to)
  eq(ticks.length <= 8, true, `24 小时窗最多 8 个刻度（得到 ${ticks.length}）`)
  eq(
    ticks.every((t) => new Date(t).getMinutes() === 0 && new Date(t).getSeconds() === 0),
    true,
    "刻度落在整点上",
  )
  eq(
    ticks.every((t, i) => i === 0 || t - ticks[i - 1] === ticks[1] - ticks[0]),
    true,
    "刻度间距均匀",
  )
  eq(timeTicks(to, to - day), [], "反向区间不产出刻度")

  // Past what two weeks can cover, the first of a month; either way a window of
  // days is labelled by date alone.
  const midnight = (t: number) => new Date(t).getHours() === 0 && new Date(t).getMinutes() === 0
  for (const days of [30, 90, 180, 365]) {
    const wide = timeTicks(to - days * day, to)
    eq(wide.length >= 3 && wide.length <= 8, true, `${days} 天窗 3 到 8 个刻度（得到 ${wide.length}）`)
    eq(wide.every(midnight), true, `${days} 天窗的刻度落在零点`)
  }
  // The zone above may have no daylight saving; New York changes on 8 March and
  // 1 November 2026.
  const zone = process.env.TZ
  process.env.TZ = "America/New_York"
  for (const end of [new Date(2026, 2, 25).getTime(), new Date(2026, 10, 20).getTime()]) {
    for (const days of [30, 90]) {
      const label = `纽约 ${new Date(end).getMonth() + 1} 月止的 ${days} 天窗跨夏令时仍落在零点`
      eq(timeTicks(end - days * day, end).every(midnight), true, label)
    }
  }
  if (zone === undefined) delete process.env.TZ
  else process.env.TZ = zone
  eq(timeTicks(to - 365 * day, to).every((t) => new Date(t).getDate() === 1), true, "一年窗的刻度落在每月 1 日")
  const october = new Date(2026, 9, 1).getTime()
  eq(tickClock(timeTicks(to - 365 * day, to), 8760)(october), "10/01", "全在零点的刻度只写日期")
  eq(tickClock(timeTicks(to - 2 * day, to), 8760)(october + 6 * 3_600_000), "10/01 06:00", "缩放到两天写回时刻")
  eq(tickClock(timeTicks(to - day, to), 24)(october + 6 * 3_600_000), "06:00", "一天之内只写时刻")
}

// windows: the round windows shorter than the history kept, then all of it.
{
  const hours = (days: number) => windows(days).map((w) => w.hours)
  eq(hours(7), [1, 6, 24, 168], "保留一周与原来的四档相同")
  eq(hours(30), [1, 6, 24, 168, 720], "默认 30 天")
  eq(hours(90), [1, 6, 24, 168, 720, 2160], "保留 90 天")
  eq(windows(365).at(-1), { hours: 8760, label: "1 年" }, "一年")
  eq(windows(45).at(-1), { hours: 1080, label: "45 天" }, "不在取整档位上的保留期作为最后一档")
  eq(hours(92), [1, 6, 24, 168, 720, 2208], "紧挨保留期的整档位不单列")
  eq(hours(8), [1, 6, 24, 192], "8 天不再并列 7 天")
  eq(windows(1).map((w) => w.label), ["1 小时", "6 小时", "1 天"], "一天")
}

// sinceSeen: the hub's count wins, null included; only its absence falls back to the browser's.
eq(sinceSeen({ last_seen: 1, last_seen_ago: 120 }), 120, "按 hub 的时钟")
eq(sinceSeen({ last_seen: Date.now() / 1000 - 300, last_seen_ago: null }), 0, "hub 说从未上报，不改用浏览器计算")
eq(Math.round(sinceSeen({ last_seen: Date.now() / 1000 - 300 })), 300, "旧 hub 由浏览器计算")

// daysUntil: whole days, negative once past, null when there is no date.
{
  const at = (days: number) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  }
  eq(daysUntil(at(10)), 10, "十天后")
  eq(daysUntil(at(-3)), -3, "已过期为负")
  eq(daysUntil(null), null, "无到期日")
  eq(daysUntil("不是日期"), null, "无法解析的日期")
}

eq(uptime(0), "—", "没上报过就不写时长")
eq(uptime(90), "1 分", "不足一小时")
eq(uptime(3 * 3600 + 25 * 60), "3 小时 25 分", "不足一天")
eq(uptime(2 * 86400 + 5 * 3600), "2 天 5 小时", "超过一天不再写分钟")

// despike：孤立的尖峰被拉回邻域，持续的高延迟保留，超时仍是缺口。
{
  const flat = [20, 21, 20, 22, 21, 20, 21]
  eq(despike(flat), flat, "没有离群点就原样返回")
  eq(despike([20, 21, 20, 900, 21, 20, 21])[3], 21, "孤立尖峰替换为窗口中位数")
  // 一段持续的高延迟是真实状况而非尖峰：窗口内多数样本同样高，中位数随之抬高。
  // 只断言尖峰那一点会漏掉这条——滑动中位数同样能通过前一条断言。
  eq(despike([20, 21, 300, 310, 305, 300, 21, 20]).slice(2, 6), [300, 310, 305, 300], "持续升高不被削掉")
  eq(despike([20, null, 900, null, 21]), [20, null, 21, null, 21], "超时保持为缺口，不参与比较")
  // 延迟以整毫秒存储，稳定线路的窗口内多数样本完全相同，绝对中位差为 0。不设下限
  // 时这条断言会失败，而它正是削峰要处理的形状：平直的线加一个 2 秒的桶。
  eq(despike([180, 180, 181, 180, 2000, 180, 180, 181, 180])[4], 180, "平直线路上的尖峰同样被削掉")
  // 下限不能低到把正常抖动也当成尖峰：整毫秒的数据里 1 ms 的起伏是常态。
  eq(despike([180, 181, 180, 180, 181, 180, 180]), [180, 181, 180, 180, 181, 180, 180], "1 ms 抖动原样保留")
}

// 旧 hub 存名称，新 hub 把其余长度存成 `<n>m`；两种写法同一个长度读法一致。
eq(["yearly", "12m", "60m", "18m", "once", "weekly"].map(cycle), ["年付", "年付", "5 年付", "18 个月付", "一次性", "weekly"], "付款周期")

// money: zh-CN whatever the browser's language, so US$ stands apart from HK$
// and JP¥ from ¥; a code Intl refuses is shown rather than thrown.
eq(money(100, "CNY"), "¥100.00", "人民币")
eq(money(100, "USD"), "US$100.00", "美元与港币等其它元区分开")
eq(money(100, "HKD"), "HK$100.00", "港币同样符号在前")
eq(money(1200, "JPY"), "JP¥1,200", "日元不带小数，与人民币分开")
eq(money(1200.5, "JPY"), "JP¥1,200.5", "日元填了小数照实显示，不取整")
eq(money(100, "港币"), "港币 100.00", "旧 hub 存下的非法代码不抛错")

eq(osName("Debian GNU/Linux 12 (bookworm)"), "Debian 12", "发行版名去掉代号")
eq(cpuName("Intel(R) Xeon(R) CPU E5-2680 8-Core Processor"), "Intel Xeon E5-2680", "CPU 名去掉商标和核数")

if (failed) {
  console.error(`\n${failed} 项不通过`)
  throw new Error("format 校验未通过")
}
console.log("format 校验通过")
