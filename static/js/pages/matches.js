function parseGamemode(gamemode) {
  console.log(gamemode);
  switch (gamemode.toLowerCase()) {
    case "vanilla_osu":
      return "std";
    case "vanilla_catch":
    case "vanilla_fruits":
      return "catch";
    case "vanilla_taiko":
      return "taiko";
    case "vanilla_mania":
      return "mania";
  }
}

function getScorePoints(score, win_condition) {
  switch (win_condition) {
    case "accuracy":
      return score?.accuracy;
    case "combo":
      return score?.combo;
    case "scorev2":
    case "score":
      return score?.score;
    default:
      return undefined;
  }
}

function sortMatchScores(scores, win_condition) {
  return scores.sort((a, b) => {
    return getScorePoints(b, win_condition) - getScorePoints(a, win_condition);
  });
}
function addHeadVSParams(event) {
  const newEvent = event;

  newEvent.scores = sortMatchScores(newEvent.scores, event.win_condition);

  const minimumOneScoreExists = newEvent.scores[0] ? true : false;
  if (!minimumOneScoreExists) return newEvent;

  const firstPlacePoints =
    getScorePoints(newEvent.scores[0], event.win_condition) || 0;
  const secondPlacePoints =
    getScorePoints(newEvent.scores[1], event.win_condition) || 0;

  newEvent.pointDifference = Math.abs(firstPlacePoints - secondPlacePoints);
  if (newEvent.pointDifference === 0 && secondPlacePoints) newEvent.winner = "tie";
  else newEvent.winner = newEvent.scores[0].player_name;

  return newEvent;
}

function addTeamVSParams(event) {
  const newEvent = event;

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

  newEvent.pointDifference = Math.abs(
    newEvent.redTeamPoints - newEvent.blueTeamPoints
  );

  if (newEvent.pointDifference === 0) {
    newEvent.winner = "tie";
  } else if (newEvent.redTeamPoints > newEvent.blueTeamPoints)
    newEvent.winner = "red";
  else newEvent.winner = "blue";

  return newEvent;
}

function addEventParams(event) {
  if (event.team_type === "head_to_head") return addHeadVSParams(event);
  return addTeamVSParams(event);
}
Vue.component("score-card", {
  props: ["score", "index", "winCondition", "gamemode", "customClass"],
  delimiters: ["<%", "%>"],

  template: `
    <div
      :class="\`play-score \${customClass}\`"
    >
      <span class="score-colocation">#<% index + 1 %></span>
      <img
        class="score-pfp"
        :src="\`https://a.\${domain}/\${score.player_id}\`"
        alt=""
      />
      <div
        style="
          display: flex;
          flex-direction: column;
          justify-content: center;
        "
      >
        <p>
          <a
            :href="\`/u/\${score.player_id}\`"
            class="score-player-name"
            ><% score.player_name %></a
          >
        </p>
        <div style="display: flex; gap: 0.25rem; min-height:14px">
          <a :href="\`/leaderboard/\${gamemode}/pp/\${score.used_mods.toLowerCase().includes('rx') ? 'rx' : 'vn'}/\${score.player_country.toLowerCase()}\`">
            <div
              class="player-flag"
              :style="\`background-image:url('/static/images/flags/\${score.player_country.toUpperCase()}.png'); margin-right:0; width:20px; height:14px;\`"
            >
              <div class="flag-dropdown">
                <% flags[score.player_country.toUpperCase()] %>
              </div>
            </div>
          </a>
          <p v-if="score.used_mods.replace('V2', '').length > 0">+<% score.used_mods.replace("V2", "") %></p>
        </div>
      </div>
      <div style="margin-left: auto; text-align: right">
        <div class="score-params-container">
          <div class="score-params">
            <div class="score-param">
              300: <% score.n300 %>
            </div>
            <div class="score-param">
              100: <% score.n100 %>
            </div>
            <div class="score-param">
              50: <% score.n50 %>
            </div>
            <div class="score-param">
              Erros: <% score.nmiss %>
            </div>
            <div class="score-param">
              Geki: <% score.ngeki %>
            </div>
            <div class="score-param">
              Katu: <% score.nkatu %>
            </div>
          </div>
          <p
            :class="\`score-score \${
              (winCondition === 'score' ||
              winCondition === 'scorev2') &&
              'win-condition'
            }\`"
          >
          <span style="font-size:0.5em; color:rgba(255,255,255,0.5)">(click)</span> <% score.score.toLocaleString() %>
          </p>
        </div>
        <div style="display: flex; gap: 0.5rem">
       
          <p
            :class="\`score-max-combo \${
              winCondition === 'combo' && 'win-condition'
            }\`"
          >
            <% score.max_combo.toLocaleString() %>x
          </p>

          <p
            :class="\`score-acc \${
              winCondition === 'accuracy' && 'win-condition'
            }\`"
          >
            <% score.accuracy.toFixed(2) %>%
          </p>
        </div>
      </div>
  `,
});

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
        return addEventParams(event);
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
