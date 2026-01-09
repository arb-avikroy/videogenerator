// Port of MetaAI class from Python to TypeScript for Deno

interface Media {
  url: string;
  type: string;
  prompt: string;
}

interface ResponseData {
  message: string;
  sources: any[];
  media: Media[];
}

export class MetaAI {
  private session: any; // For simplicity, use fetch, not session
  private accessToken: string | null = null;
  private fbEmail: string | null;
  private fbPassword: string | null;
  private proxy: any = null;
  private isAuthed: boolean;
  private cookies: Record<string, string> = {};
  private externalConversationId: string | null = null;
  private offlineThreadingId: string | null = null;

  constructor(fbEmail: string | null = null, fbPassword: string | null = null, proxy: any = null) {
    this.fbEmail = fbEmail;
    this.fbPassword = fbPassword;
    this.proxy = proxy;
    this.isAuthed = fbPassword !== null && fbEmail !== null;
  }

  async init() {
    this.cookies = await this.getCookies();
  }

  private extractValue(html: string, startStr: string, endStr: string): string {
    const startIndex = html.indexOf(startStr);
    if (startIndex === -1) return "";
    const valueStart = startIndex + startStr.length;
    const endIndex = html.indexOf(endStr, valueStart);
    if (endIndex === -1) return "";
    return html.substring(valueStart, endIndex);
  }

  private async getCookies(): Promise<Record<string, string>> {
    if (this.isAuthed) {
      throw new Error("Authenticated MetaAI login is not supported in this environment. Use non-authenticated mode.");
    }

    const response = await fetch("https://www.meta.ai/");
    const content = await response.text();

    const cookies: Record<string, string> = {
      "_js_datr": this.extractValue(content, '_js_datr":{"value":"', '",'),
      "datr": this.extractValue(content, 'datr":{"value":"', '",'),
      "lsd": this.extractValue(content, '"LSD",[],{"token":"', '"}'),
      "fb_dtsg": this.extractValue(content, 'DTSGInitData",[],{"token":"', '"'),
      "abra_csrf": this.extractValue(content, 'abra_csrf":{"value":"', '",'),
    };

    return cookies;
  }

  async getAccessToken(): Promise<string> {
    if (this.accessToken) return this.accessToken;

    const url = "https://www.meta.ai/api/graphql/";
    const payload = new URLSearchParams({
      "lsd": this.cookies["lsd"],
      "fb_api_caller_class": "RelayModern",
      "fb_api_req_friendly_name": "useAbraAcceptTOSForTempUserMutation",
      "variables": JSON.stringify({
        "dob": "1999-01-01",
        "icebreaker_type": "TEXT",
        "__relay_internal__pv__WebPixelRatiorelayprovider": 1,
      }),
      "doc_id": "7604648749596940",
    });

    const headers = {
      "content-type": "application/x-www-form-urlencoded",
      "cookie": `_js_datr=${this.cookies["_js_datr"]}; abra_csrf=${this.cookies["abra_csrf"]}; datr=${this.cookies["datr"]};`,
      "sec-fetch-site": "same-origin",
      "x-fb-friendly-name": "useAbraAcceptTOSForTempUserMutation",
    };

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: payload,
    });

    const authJson = await response.json();
    this.accessToken = authJson.data.xab_abra_accept_terms_of_service.new_temp_user_auth.access_token;

    // Sleep for 1 second
    await new Promise(resolve => setTimeout(resolve, 1000));

    return this.accessToken!;
  }

  async prompt(message: string, stream: boolean = false, attempts: number = 0, newConversation: boolean = false): Promise<ResponseData> {
    let authPayload: Record<string, string>;
    let url: string;

    if (!this.isAuthed) {
      this.accessToken = await this.getAccessToken();
      authPayload = { access_token: this.accessToken };
      url = "https://graph.meta.ai/graphql?locale=user";
    } else {
      authPayload = { fb_dtsg: this.cookies["fb_dtsg"] };
      url = "https://www.meta.ai/api/graphql/";
    }

    if (!this.externalConversationId || newConversation) {
      this.externalConversationId = crypto.randomUUID();
    }

    const variables = {
      message: { sensitive_string_value: message },
      externalConversationId: this.externalConversationId,
      offlineThreadingId: generateOfflineThreadingId(),
      suggestedPromptIndex: null,
      flashVideoRecapInput: { images: [] },
      flashPreviewInput: null,
      promptPrefix: null,
      entrypoint: "ABRA__CHAT__TEXT",
      icebreaker_type: "TEXT",
      __relay_internal__pv__AbraDebugDevOnlyrelayprovider: false,
      __relay_internal__pv__WebPixelRatiorelayprovider: 1,
    };

    const payload = new URLSearchParams({
      ...authPayload,
      fb_api_caller_class: "RelayModern",
      fb_api_req_friendly_name: "useAbraSendMessageMutation",
      variables: JSON.stringify(variables),
      server_timestamps: "true",
      doc_id: "7783822248314888",
    });

    const headers: Record<string, string> = {
      "content-type": "application/x-www-form-urlencoded",
      "x-fb-friendly-name": "useAbraSendMessageMutation",
    };

    if (this.isAuthed) {
      headers["cookie"] = `abra_sess=${this.cookies["abra_sess"]}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: payload,
    });

    const rawResponse = await response.text();
    const lastStreamedResponse = this.extractLastResponse(rawResponse);
    if (!lastStreamedResponse) {
      return this.retry(message, stream, attempts);
    }

    const extractedData = await this.extractData(lastStreamedResponse);
    return extractedData;
  }

  private extractLastResponse(response: string): any {
    let lastStreamedResponse = null;
    for (const line of response.split("\n")) {
      try {
        const jsonLine = JSON.parse(line);
        const botResponseMessage = jsonLine.data?.node?.bot_response_message;
        const chatId = botResponseMessage?.id;
        if (chatId) {
          const [externalConversationId, offlineThreadingId] = chatId.split("_");
          this.externalConversationId = externalConversationId;
          this.offlineThreadingId = offlineThreadingId;
        }
        const streamingState = botResponseMessage?.streaming_state;
        if (streamingState === "OVERALL_DONE") {
          lastStreamedResponse = jsonLine;
        }
      } catch {}
    }
    return lastStreamedResponse;
  }

  private async extractData(jsonLine: any): Promise<ResponseData> {
    const botResponseMessage = jsonLine.data?.node?.bot_response_message;
    const response = formatResponse(jsonLine);
    const fetchId = botResponseMessage?.fetch_id;
    const sources = fetchId ? await this.fetchSources(fetchId) : [];
    const medias = this.extractMedia(botResponseMessage);
    return { message: response, sources, media: medias };
  }

  private extractMedia(jsonLine: any): Media[] {
    const medias: Media[] = [];
    const imagineCard = jsonLine?.imagine_card;
    const session = imagineCard?.session;
    const mediaSets = session?.media_sets || [];
    for (const mediaSet of mediaSets) {
      const imagineMedia = mediaSet?.imagine_media || [];
      for (const media of imagineMedia) {
        medias.push({
          url: media.uri,
          type: media.media_type,
          prompt: media.prompt,
        });
      }
    }
    return medias;
  }

  private async fetchSources(fetchId: string): Promise<any[]> {
    // Implement if needed, for now return []
    return [];
  }

  private async retry(message: string, stream: boolean, attempts: number): Promise<ResponseData> {
    if (attempts <= 3) {
      console.warn(`Retrying... Attempt ${attempts + 1}/3`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      return this.prompt(message, stream, attempts + 1);
    } else {
      throw new Error("Unable to obtain a valid response from Meta AI.");
    }
  }
}

function generateOfflineThreadingId(): string {
  // Port the Python function
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function formatResponse(response: any): string {
  // Port the format_response from utils
  // Assuming it's to extract the message
  return response.data?.node?.bot_response_message?.message?.text || "";
}
