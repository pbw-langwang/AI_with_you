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
} from "./diagnosis";
import { llmService } from "../services/llm";

// 应用状态
export const appState = reactive<AppState>({
  avatar: {
    appId: "1749f2b1661b4134ab4964d27820417a",
    appSecret: "c8122b00df3041459137462c4ceaf3d5",
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
    const { llm, ui, avatar } = appState;

    if (!ui.text || !avatar.instance) {
      return;
    }

    try {
      const deptMatch = ui.text.match(/我要去(.+?)科室/);
      if (deptMatch) {
        const dept = deptMatch[1];
        await this.waitForAvatarReady();
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

      const merchantMatch = ui.text.match(/我要去(.+?)商家/);
      if (merchantMatch) {
        const merchant = merchantMatch[1];
        await this.waitForAvatarReady();
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

      if (isDiagnosisTrigger(ui.text)) {
        await this.waitForAvatarReady();
        const textOut = runDiagnosis(appState);
        return textOut;
      }

      const stream = await llmService.sendMessageWithStream(
        {
          provider: "openai",
          model: llm.model,
          apiKey: llm.apiKey,
        },
        ui.text,
      );

      if (!stream) return;

      await this.waitForAvatarReady();

      let buffer = "";
      let isFirstChunk = true;
      const takeSentence = (s: string): [string | null, string] => {
        const n = s.length;
        for (let i = 0; i < n; i++) {
          const ch = s[i];
          if (/[。！？!?.,，；;…]/.test(ch)) {
            const idx = i + 1;
            return [s.slice(0, idx), s.slice(idx)];
          }
        }
        return [null, s];
      };

      for await (const chunk of stream) {
        buffer += chunk;
        while (true) {
          const [head, tail] = takeSentence(buffer);
          if (!head) break;
          const ssml = generateSSML(head);
          if (isFirstChunk) {
            avatar.instance.speak(ssml, true, false);
            isFirstChunk = false;
          } else {
            avatar.instance.speak(ssml, false, false);
          }
          buffer = tail;
        }
      }

      if (buffer.length > 0) {
        const ssml = generateSSML(buffer[0]);

        if (isFirstChunk) {
          avatar.instance.speak(ssml, true, false);
        } else {
          avatar.instance.speak(ssml, false, false);
        }
      }

      const finalSsml = generateSSML("");
      avatar.instance.speak(finalSsml, false, true);

      return buffer;
    } catch (error) {
      console.error("发送消息失败:", error);
      throw error;
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
