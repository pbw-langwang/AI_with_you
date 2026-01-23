import { generateSSML } from "../utils";
import type { AppState } from "../types";

export function isDiagnosisTrigger(text: string): boolean {
  return /(我的症状是什么|症状是什么|我的症状是|症状是|症状)/.test(text);
}

export function runDiagnosis(appState: AppState): string {
  appState.ui.diagnosis = {
    active: true,
    lines: [
      "详细描述一下你的症状，我在听！",
      "根据医院数据库分析，你可能……",
      "您应该去口腔科室就诊，你可以直接输入我要去口腔科室，我会给你院内导航！",
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
      "本商场好玩的有：影院、儿童乐园、VR体验区",
      "根据您的兴趣，我可以推荐适合的娱乐项目",
      "您可以直接输入我要去商家1或商家2，我会给你商场内导航！",
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
