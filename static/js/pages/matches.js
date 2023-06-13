function getScorePoints(score, win_condition) {
  switch (win_condition) {
    case "accuracy":
      return score.accuracy;
    case "combo":
      return score.combo;
    case "scorev2":
    case "score":
      return score.score;
  }
}

function sortMatchScores(scores, win_condition) {
  return scores.sort((a, b) => {
    return getScorePoints(b, win_condition) - getScorePoints(a, win_condition);
  });
}

function sortMatchTeams(event) {
  const newEvent = event;
  if (event.team_type === "head_to_head") {
    newEvent.scores = sortMatchScores(newEvent.scores, event.win_condition);
    return newEvent;
  }
  newEvent.redTeam = [];
  newEvent.redTeamPoints = 0;

  newEvent.blueTeam = [];
  newEvent.blueTeamPoints = 0;

  event.scores.forEach((score) => {
    if (score.player_team === "red") {
      newEvent.redTeamPoints += getScorePoints(score, event.win_condition);
      return newEvent.redTeam.push(score);
    }
    newEvent.blueTeamPoints += getScorePoints(score, event.win_condition);
    newEvent.blueTeam.push(score);
  });

  newEvent.redTeam = sortMatchScores(newEvent.redTeam, event.win_condition);
  newEvent.blueTeam = sortMatchScores(newEvent.blueTeam, event.win_condition);

  return newEvent;
}

new Vue({
  el: "#app",
  delimiters: ["<%", "%>"],
  data() {
    return {
      matchEvents: [],
      matchBeatmaps: new Map(),
      matchUsers: new Map(),
    };
  },
  created() {
    this.getMatchData();
  },
  methods: {
    async getMatchData() {
      // TODO: REMOVE HARD CODED DOMAIN
      const response = await this.$axios.get(
        `https://api.takuji.nkrw.dev/v1/get_match?id=${matchId}`
      );
      const matchEvents = response.data.match.map((event) => {
        if (event.type !== "beatmap_play") return event;
        return sortMatchTeams(event);
      });
      this.$set(this, "matchEvents", matchEvents);
      console.log(this.matchEvents);

      this.setupPageMetadata();
      await this.getMatchBeatmaps();
      console.log(this.matchBeatmaps);
    },
    async getMatchPlayers() {
      const matchUsers = new Map();
      const requestedUsers = new Set();

      await Promise.all(
        this.matchEvents.map(async (event) => {
          if (
            event.type !== "player_join" ||
            requestedUsers.has(event.player_id)
          )
            return;
          requestedUsers.add(event.player_id);
          // TODO: REMOVE HARD CODED DOMAIN

          const response = await this.$axios.get(
            `https://api.takuji.nkrw.dev/v1/get_player_info`,
            {
              params: {
                id: event.player_id,
                scope: "info",
              },
            }
          );
          matchUsers.set(event.player_id, response.data.player.info);
        })
      );

      this.$set(this, "matchUsers", matchUsers);
    },
    async getMatchBeatmaps() {
      const matchBeatmaps = new Map();
      const requestedBeatmaps = new Set();

      await Promise.all(
        this.matchEvents.map(async (event) => {
          if (
            event.type !== "beatmap_play" ||
            requestedBeatmaps.has(event.bmap_id)
          )
            return;
          requestedBeatmaps.add(event.bmap_id);
          // TODO: REMOVE HARD CODED DOMAIN

          const response = await this.$axios.get(
            `https://api.takuji.nkrw.dev/v1/get_map_info`,
            {
              params: {
                id: event.bmap_id,
              },
            }
          );
          matchBeatmaps.set(event.bmap_id, response.data.map);
        })
      );
      this.$set(this, "matchBeatmaps", matchBeatmaps);
    },

    setupPageMetadata() {
      if (!this.matchEvents[0]) return;

      document.title = `${this.matchEvents[0].name} - lobby | ${appName}`;
    },
  },
});
