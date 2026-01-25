import { generateSSML } from "../utils";
import type { AppState } from "../types";

export function isDiagnosisTrigger(text: string): boolean {
  return /(我的症状是什么|症状是什么|我的症状是|症状是|症状)/.test(text);
}

export function runDiagnosis(appState: AppState): string {
  appState.ui.diagnosis = {
    active: true,
    lines: [
      "详细描述一下您的症状，我在听！",
      "根据医院数据库分析，您可能是因为伤风感染导致的发热、咽喉痛！",
      "您应该去发热门诊就诊，您可以直接输入我要去发热门诊，我会给您院内导航！",
    ],
  };
  if (appState.ui.routeGuide) {
    appState.ui.routeGuide.visible = false;
  }
  const speakParts = ["好的", ...appState.ui.diagnosis.lines];
  for (let i = 0; i < speakParts.length; i++) {
    const isFirst = i === 0;
    const isLast = i === speakParts.length - 1;
    appState.avatar.instance.speak(
      generateSSML(speakParts[i]),
      isFirst,
      isLast,
    );
  }
  return speakParts.join("。");
}

export function isMallFunTrigger(text: string): boolean {
  return /(这个商场有什么好玩的|商场有什么好玩的|有什么好玩的|什么玩的|玩的)/.test(text);
}

export function runMallFun(appState: AppState): string {
  appState.ui.diagnosis = {
    active: true,
    lines: [
      "本商场好玩的有：影院、儿童乐园、VR体验区！",
      "您可以说出您的想法，我会为您推荐适合的娱乐项目，我在听！",
      "根据您的想法，我推荐您去影院，直接输入我要去影院商家，我会给您商场内导航！",
    ],
  };
  if (appState.ui.routeGuide) {
    appState.ui.routeGuide.visible = false;
  }
  const speakParts = ["好的", ...appState.ui.diagnosis.lines];
  for (let i = 0; i < speakParts.length; i++) {
    const isFirst = i === 0;
    const isLast = i === speakParts.length - 1;
    appState.avatar.instance.speak(
      generateSSML(speakParts[i]),
      isFirst,
      isLast,
    );
  }
  return speakParts.join("。");
}

export function isMallFoodTrigger(text: string): boolean {
  return /(这个商场有什么好吃的|商场有什么好吃的|有什么好吃的|什么吃的|吃的)/.test(text);
}

export function runMallFood(appState: AppState): string {
  appState.ui.diagnosis = {
    active: true,
    lines: [
      "本商场好吃的有：云南特色餐厅、贵州风味餐厅、咖啡厅、奶茶店、火锅店……",
      "您可以说出您喜欢的口味，我可以推荐适合的餐饮店铺，我在听！",
      "根据您的口味，我推荐您去贵州风味餐厅，直接输入我要去贵州风味餐厅，我会给您商场内导航！",
    ],
  };
  if (appState.ui.routeGuide) {
    appState.ui.routeGuide.visible = false;
  }
  const speakParts = ["好的", ...appState.ui.diagnosis.lines];
  for (let i = 0; i < speakParts.length; i++) {
    const isFirst = i === 0;
    const isLast = i === speakParts.length - 1;
    appState.avatar.instance.speak(
      generateSSML(speakParts[i]),
      isFirst,
      isLast,
    );
  }
  return speakParts.join("。");
}
