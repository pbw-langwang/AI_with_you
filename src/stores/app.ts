import { reactive, ref } from "vue";
import type { AppState } from "../types";
import { LLM_CONFIG, APP_CONFIG } from "../constants";
import { validateConfig, delay, generateSSML } from "../utils";
import { buildRouteGuide, splitSpeakParts } from "./routeBuilder";
import { avatarService } from "../services/avatar";
import {
  isDiagnosisTrigger,
  runDiagnosis,
  isMallFunTrigger,
  runMallFun,
  isMallFoodTrigger,
  runMallFood,
} from "./diagnosis";

// 应用状态
export const appState = reactive<AppState>({
  avatar: {
    appId: "ba63f0ac8a3a4237aac339b04320e483",
    appSecret: "110efe12348d4487aa35e8575a6d6d9b",
    connected: false,
    instance: null,
  },
  asr: {
    provider: "tx",
    appId: "",
    secretId: "",
    secretKey: "",
    isListening: false,
  },
  llm: {
    model: LLM_CONFIG.DEFAULT_MODEL,
    apiKey: "",
  },
  ui: {
    text: "",
    subTitleText: "",
    routeTravel: 0,
    routeResetToken: 0,
    diagnosis: { active: false, lines: [] },
  },
});

// 虚拟人状态
export const avatarState = ref("");

// Store类 - 业务逻辑处理
export class AppStore {
  /**
   * 连接虚拟人
   * @returns {Promise<void>} - 返回连接结果的Promise
   * @throws {Error} - 当appId或appSecret为空或连接失败时抛出错误
   */
  async connectAvatar(): Promise<void> {
    const { appId, appSecret } = appState.avatar;

    if (!validateConfig({ appId, appSecret }, ["appId", "appSecret"])) {
      throw new Error("appId 或 appSecret 为空");
    }

    try {
      // 若已有连接，先断开以避免房间占用
      if (appState.avatar.instance) {
        this.disconnectAvatar();
        await delay(300);
      }

      const avatar = await avatarService.connect(
        {
          appId,
          appSecret,
        },
        {
          onSubtitleOn: (text: string) => {
            appState.ui.subTitleText = text;
          },
          onSubtitleOff: () => {
            appState.ui.subTitleText = "";
          },
          onStateChange: (state: string) => {
            avatarState.value = state;
          },
        },
      );

      appState.avatar.instance = avatar;
      appState.avatar.connected = true;
    } catch (error) {
      appState.avatar.connected = false;
      const msg = String((error as any)?.message || error);
      if (/房间限流/.test(msg)) {
        // 房间限流：尝试断开并重试一次
        this.disconnectAvatar();
        await delay(1000 * 10);
        const avatar = await avatarService.connect(
          { appId, appSecret },
          {
            onSubtitleOn: (text: string) => {
              appState.ui.subTitleText = text;
            },
            onSubtitleOff: () => {
              appState.ui.subTitleText = "";
            },
            onStateChange: (state: string) => {
              avatarState.value = state;
            },
          },
        );
        appState.avatar.instance = avatar;
        appState.avatar.connected = true;
      } else {
        throw error;
      }
    }
  }

  /**
   * 断开虚拟人连接
   * @returns {void}
   */
  disconnectAvatar(): void {
    if (appState.avatar.instance) {
      avatarService.disconnect(appState.avatar.instance);
      appState.avatar.instance = null;
      appState.avatar.connected = false;
      avatarState.value = "";
    }
  }

  /**
   * 发送消息到LLM并让虚拟人播报
   * @returns {Promise<string | undefined>} - 返回大语言模型的回复内容，失败时返回undefined
   * @throws {Error} - 当发送消息失败时抛出错误
   */
  async sendMessage(): Promise<string | undefined> {
    const { ui, avatar } = appState;

    if (!ui.text || !avatar.instance) {
      return;
    }

    try {
      // Match hospital departments (科室 or 门诊)
      const deptMatch = ui.text.match(/去(.+?)(科室|门诊)/);
      if (deptMatch) {
        const dept = deptMatch[1];
        await this.waitForAvatarReady();
        if (appState.ui.diagnosis?.active) {
          appState.ui.diagnosis.active = false;
          appState.ui.diagnosis.lines = [];
        }
        appState.ui.routeTravel = 0;
        appState.ui.routeResetToken = (appState.ui.routeResetToken || 0) + 1;
        const { speakText, guide, subTitle } = buildRouteGuide(
          "department",
          dept,
        );
        appState.ui.subTitleText = subTitle;
        appState.ui.routeGuide = guide;
        const parts = splitSpeakParts(speakText);
        if (parts.length > 0) {
          avatar.instance.speak(
            generateSSML(parts[0]),
            true,
            parts.length === 1,
          );
          for (let i = 1; i < parts.length; i++) {
            const isLast = i === parts.length - 1;
            avatar.instance.speak(generateSSML(parts[i]), false, isLast);
          }
        }
        return speakText;
      }

      // Match mall merchants (all other 去某某 patterns)
      const merchantMatch = ui.text.match(/去(.+?)(?!科室|门诊)/);
      if (merchantMatch && merchantMatch[1].trim()) {
        const merchant = merchantMatch[1].trim();
        await this.waitForAvatarReady();
        if (appState.ui.diagnosis?.active) {
          appState.ui.diagnosis.active = false;
          appState.ui.diagnosis.lines = [];
        }
        appState.ui.routeTravel = 0;
        appState.ui.routeResetToken = (appState.ui.routeResetToken || 0) + 1;
        const { speakText, guide, subTitle } = buildRouteGuide(
          "merchant",
          merchant,
        );
        appState.ui.subTitleText = subTitle;
        appState.ui.routeGuide = guide;
        const parts = splitSpeakParts(speakText);
        if (parts.length > 0) {
          avatar.instance.speak(
            generateSSML(parts[0]),
            true,
            parts.length === 1,
          );
          for (let i = 1; i < parts.length; i++) {
            const isLast = i === parts.length - 1;
            avatar.instance.speak(generateSSML(parts[i]), false, isLast);
          }
        }
        return speakText;
      }

      if (isMallFunTrigger(ui.text)) {
        await this.waitForAvatarReady();
        const textOut = runMallFun(appState);
        return textOut;
      }

      if (isMallFoodTrigger(ui.text)) {
        await this.waitForAvatarReady();
        const textOut = runMallFood(appState);
        return textOut;
      }

      if (isDiagnosisTrigger(ui.text)) {
        await this.waitForAvatarReady();
        const textOut = runDiagnosis(appState);
        return textOut;
      }

      // If no patterns match, prompt that there's no such feature
      await this.waitForAvatarReady();
      const noFeatureText = "暂时没有该功能";
      avatar.instance.speak(generateSSML(noFeatureText), true, true);
      return noFeatureText;
    } catch (error) {
      console.error("发送消息失败:", error);
      // If error occurs, prompt that there's no such feature
      await this.waitForAvatarReady();
      const noFeatureText = "暂时没有该功能";
      avatar.instance.speak(generateSSML(noFeatureText), true, true);
      return noFeatureText;
    }
  }

  /**
   * 开始语音输入
   * @param callbacks - 回调函数集合
   * @param callbacks.onFinished - 语音识别完成回调
   * @param callbacks.onError - 语音识别错误回调
   * @returns {void}
   */
  startVoiceInput(): void {
    appState.asr.isListening = true;
    // ASR逻辑由组件处理
  }

  /**
   * 停止语音输入
   * @returns {void}
   */
  stopVoiceInput(): void {
    appState.asr.isListening = false;
  }

  /**
   * 等待虚拟人准备就绪（不在说话状态）
   * @returns {Promise<void>} - 返回等待完成的Promise
   */
  private async waitForAvatarReady(): Promise<void> {
    if (avatarState.value === "speak") {
      appState.avatar.instance.think();
      await delay(APP_CONFIG.SPEAK_INTERRUPT_DELAY);
    }
  }
}

// 导出单例
export const appStore = new AppStore();
