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
      this.$set(this, "matchEvents", response.data.match);

      this.setupPageMetadata();
      console.log(this.matchUsers, this.matchBeatmaps);
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
