type RemarkState = "live" | "offline" | "pending";

const REMARKS: Record<RemarkState, readonly string[]> = {
  live: [
    "资源全公开，指标看得见",
    "小小广告位，装着真实服务器",
    "不卖关子，负载直接亮出来",
    "服务器在忙，数据在这里报到",
    "招牌够醒目，指标够清楚",
    "这块广告牌，只展示真数据",
    "CPU 有多忙，一眼就知道",
    "流量明码展示，用量心里有数",
    "节点摆上墙，状态摊开看",
    "今日照常营业，指标持续上报",
    "主机不说话，数据替它开口",
    "看板有排面，资源有账本",
    "每一份负载，都有迹可循",
    "广告可以热闹，数据必须实在",
    "在线不靠喊，状态看上报",
    "把服务器的日常，贴在这面墙",
    "内存磁盘流量，统统摆上台面",
    "不藏资源账，欢迎随时查看",
    "这台主机的近况，都写在下面",
    "大字报招呼你，小指标告诉你",
    "看得见的负载，查得到的历史",
    "墙上这块招牌，背后就是主机",
    "状态持续更新，资源如实展示",
    "有图有数据，主机近况不含糊",
  ],
  offline: [
    "实时状态暂停，累计流量仍可查看",
    "节点暂时离线，历史档案照常开放",
    "连接暂歇，资源账本还在",
    "主机暂时休息，历史记录留在墙上",
    "实时招牌暂停，累计数据仍在",
    "等待重新连接，历史近况可查",
    "离线状态如实展示，不把旧值当实时",
    "暂时没有新上报，累计记录仍可查看",
  ],
  pending: [
    "连接已建立，等待首次指标上报",
    "招牌已经挂好，等待数据报到",
    "节点已连接，指标正在等候上报",
    "先把位置留好，等待首份数据",
    "等待首次上报，暂不填入资源数值",
    "主机已入场，等指标来亮相",
  ],
};

// A mixed node ID gives each server a fixed pseudo-random slot across reloads,
// browsers and group ordering, without writing Monitor data or browser storage.
export function nodeRemark(id: number, state: RemarkState): string {
  let seed = id | 0;
  seed = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b);
  seed = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b);
  seed = (seed ^ (seed >>> 16)) >>> 0;
  const phrases = REMARKS[state];
  return phrases[seed % phrases.length];
}
