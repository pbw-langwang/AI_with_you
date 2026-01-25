export function buildRouteGuide(kind: "department" | "merchant", name: string) {
  const noun = kind === "merchant" ? "商家" : "科室";
  const speakText =
    kind === "merchant"
      ? `好的，为您导航到${name}。请从入口进入大厅。按照图中指示，穿过大厅到电梯间。乘电梯至对应楼层。沿走廊前往${name}。祝您购物愉快！`
      : `好的，为您导航到${name}科室。请从入口进入大厅。按照图中指示，穿过大厅到电梯间。乘电梯至对应楼层。沿走廊前往${name}科室。祝您就诊顺利！`;
  const dur = Math.max(6, Math.min(20, Math.round(speakText.length / 10)));
  return {
    speakText,
    guide: {
      visible: true,
      title: `到 ${name}${noun} 的路线引导`,
      steps: [
        "从入口进入大厅",
        "按照图中指示，穿过大厅到电梯间",
        "乘电梯至对应楼层",
        `沿走廊前往 ${name} ${noun}`,
        `到达${noun}门口`,
      ],
      mode: kind,
      durationSec: dur,
    },
    subTitle: `为您规划到 ${name}${noun} 的路线`,
  };
}

export function splitSpeakParts(text: string): string[] {
  const parts =
    text
      .match(/[^。！？,.，]+[。！？,.，]?/g)
      ?.map((s) => s.trim())
      .filter(Boolean) ?? [];
  return parts.length ? parts : [text];
}
