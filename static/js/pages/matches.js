function parseGamemode(gamemode) {
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
      return score?.max_combo;
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
  if (newEvent.pointDifference === 0 && secondPlacePoints)
    newEvent.winner = "tie";
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
      <div class="score-start-holder">
        <p class="score-colocation">#<% index + 1 %></p>
        <p :class="\`  score-rank rank-\${score.grade}\`" >
          <% score.grade.replace("SH", "S").replace("XH", "SS").replace("X",
          "SS") %>
        </p>
      </div>
      <a :href="\`/u/\${score.player_id}\`">
        <img
        class="score-pfp"
        :src="\`https://a.\${domain}/\${score.player_id}\`"
        alt=""
        />
      </a>
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
        <div style="display: flex; gap: 0.25rem; min-height:14px; flex-wrap:wrap;">
          <a :href="\`/leaderboard/\${gamemode}/pp/\${score.used_mods.toLowerCase().includes('rx') ? 'rx' : 'vn'}/\${score.player_country.toLowerCase()}\`">
            <div
              class="player-flag"
              :style="\`background-image:url('/static/images/flags/\${score.player_country.toUpperCase()}.png'); margin-right:0;\`"
            >
              <div class="flag-dropdown">
                <% flags[score.player_country.toUpperCase()] %>
              </div>
            </div>
          </a>
          <p class="score-mods" v-if="score.used_mods.replace('V2', '').length > 0">+<% score.used_mods.replace("V2", "") %></p>
        </div>
      </div>
      <div style="margin-left: auto; text-align: right">
        <div class="score-params-container">
          <p
            :class="\`score-param score-score \${
              (winCondition === 'score' ||
              winCondition === 'scorev2') &&
              'win-condition'
            }\`"
          >
            <span class="score-param-name score">score</span><% score.score.toLocaleString() %>
          </p>
        </div>
        <div style="display: flex; gap: 0.5rem; justify-content:end">
       
          <p
            :class="\`score-param score-max-combo \${
              winCondition === 'combo' && 'win-condition'
            }\`"
          >
            <span class="score-param-name combo">combo</span><% score.max_combo.toLocaleString() %>x
          </p>

          <p
            :class="\`score-param score-acc \${
              winCondition === 'accuracy' && 'win-condition'
            }\`"
          >
            <span class="score-param-name acc">acc</span><% score.accuracy.toFixed(2) %>%
          </p>
        </div>
        <div style="display:flex; gap:0.25rem;">
          <p style="text-align:center;">
            <span class="score-param-name x300">300x</span> <% score.n300 %>
          </p>
          <p style="text-align:center;">
            <span class="score-param-name x100">100x</span> <% score.n100 %>
          </p>
          <p style="text-align:center;">
            <span class="score-param-name x50">50x</span> <% score.n50 %>
          </p>
          <p style="text-align:center;">
            <span class="score-param-name xmiss">0x</span> <% score.nmiss %>
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
      loadingFailed: false,
    };
  },
  created() {
    this.getMatchData();
  },
  methods: {
    async getMatchData() {
      // TODO: REMOVE HARD CODED DOMAIN
      const response = await this.$axios.get(
        `https://api.${domain}/v1/get_match?id=${matchId}`
      );
      if (!response?.data?.match) {
        return this.$set(this, "loadingFailed", true);
      }

      const matchEvents = response.data.match.map((event) => {
        if (event.type !== "beatmap_play") return event;
        return addEventParams(event);
      });
      this.$set(this, "matchEvents", matchEvents);

      this.setupPageMetadata();
      await this.getMatchBeatmaps();
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
            `https://api.${domain}/v1/get_player_info`,
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
            `https://api.${domain}/v1/get_map_info`,
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
