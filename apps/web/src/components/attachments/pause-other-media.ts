const MEDIA_PLAYER_SELECTOR = "audio[data-rtnote-audio-player], video[data-rtnote-video-player]";

export const pauseOtherMediaPlayers = (activePlayer: HTMLMediaElement) => {
  activePlayer.ownerDocument
    .querySelectorAll<HTMLMediaElement>(MEDIA_PLAYER_SELECTOR)
    .forEach((player) => {
      if (player !== activePlayer) player.pause();
    });
};
