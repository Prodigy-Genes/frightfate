"use client";

import { useEffect } from "react";
import { initGame } from "@/lib/game";
import { NameModalHost } from "@/components/NameModal";
import { AiStatusBadge } from "@/components/AiStatusBadge";
import { AudioHud } from "@/components/AudioHud";
import { BackgroundEffects } from "@/components/BackgroundEffects";
import { GameTitle } from "@/components/GameTitle";
import { HomeScreen } from "@/components/screens/HomeScreen";
import { JoinScreen } from "@/components/screens/JoinScreen";
import { LobbyScreen } from "@/components/screens/LobbyScreen";
import { GameScreen } from "@/components/screens/GameScreen";
import { EliminationScreen } from "@/components/screens/EliminationScreen";
import { ResultsScreen } from "@/components/screens/ResultsScreen";
import { LeaderboardScreen } from "@/components/screens/LeaderboardScreen";

export default function Page() {
  useEffect(() => {
    const cleanup = initGame();
    return cleanup;
  }, []);

  return (
    <>
      <AudioHud />
      <AiStatusBadge />
      <NameModalHost />

      <div id="app">
        <BackgroundEffects />

        <div className="container">
          <GameTitle />

          {/* All screens stay mounted; the controller toggles the `.active` class. */}
          <HomeScreen />
          <JoinScreen />
          <LobbyScreen />
          <GameScreen />
          <EliminationScreen />
          <ResultsScreen />
          <LeaderboardScreen />
        </div>
      </div>
    </>
  );
}
