import { soundEngine } from "../audio";
import { el } from "../dom";
import type { AnyRecord } from "../types";
import type { FrightFateGame } from "./controller";

/** Manages the live lobby/game WebSocket connection. */
export class SocketManager {
  private socket: WebSocket | null = null;
  private pingInterval: number | null = null;

  constructor(private game: FrightFateGame) {}

  connect(sessionCode: string): void {
    this.disconnect();

    const wsUrl = `${this.game.wsBaseUrl}/ws/${sessionCode}`;
    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log("🔗 WebSocket connected:", wsUrl);
        if (this.game.state.playerId) {
          this.send({
            type: "register",
            player_id: this.game.state.playerId,
            player_name: this.game.state.playerName,
          });
        }
        this.pingInterval = window.setInterval(() => {
          if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type: "ping" }));
          }
        }, 15000);
      };

      this.socket.onmessage = (event) => {
        try {
          this.handleMessage(JSON.parse(event.data));
        } catch (err) {
          console.error("Error parsing WS message:", err);
        }
      };

      this.socket.onclose = () => {
        console.log("WebSocket disconnected");
        if (this.pingInterval) window.clearInterval(this.pingInterval);
      };

      this.socket.onerror = (err) => {
        console.warn("WebSocket connection error:", err);
      };
    } catch (err) {
      console.warn("Could not initialize WebSocket:", err);
    }
  }

  isOpen(): boolean {
    return !!this.socket && this.socket.readyState === WebSocket.OPEN;
  }

  send(payload: AnyRecord): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
    }
  }

  disconnect(): void {
    if (this.pingInterval) {
      window.clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.socket) {
      try {
        this.socket.close();
      } catch {}
      this.socket = null;
    }
  }

  private handleMessage(data: AnyRecord): void {
    if (!data || !data.type) return;

    if (
      data.type === "player_registered" ||
      data.type === "player_joined" ||
      data.type === "player_left"
    ) {
      const lobbyScreen = el("lobbyScreen");
      if (lobbyScreen && lobbyScreen.classList.contains("active")) {
        void this.game.session.loadLobby();
      }
      if (data.player_name) {
        this.game.ui.showNotification(
          `${data.player_name} ${data.type === "player_left" ? "left" : "joined"} the game`,
          "info"
        );
      }
    }

    if (data.type === "game_started") {
      const lobbyScreen = el("lobbyScreen");
      if (lobbyScreen && lobbyScreen.classList.contains("active")) {
        this.game.ui.showNotification("The game has begun! Survive or perish...", "warning");
        void this.game.round.runStartGame();
      }
    }

    if (data.type === "player_eliminated") {
      this.game.ui.showNotification(`💀 ${data.player_name || "A player"} was eliminated!`, "error");
      soundEngine.playStinger();
    }

    if (data.type === "feed_event" && data.event) {
      this.game.session.appendFateFeedEvent(data.event);
    }
  }
}
