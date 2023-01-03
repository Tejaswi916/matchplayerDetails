const express = require("express");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const path = require("path");
const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "cricketMatchDetails.db");
let db = null;
const initializeDbAndServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3000, () => {
      console.log("Server is running on http://localhost:3000");
    });
  } catch (err) {
    console.log(`Database Error is ${err}`);
    process.exit(1);
  }
};
initializeDbAndServer();

//API 1
//Returns a list of all the players in the player table
const convertPlayerDBObject = (obj) => {
  return {
    playerId: obj.player_id,
    playerName: obj.player_name,
  };
};

//GET Returns a list of all the players in the player table
app.get("/players/", async (request, response) => {
  const getAllPlayersQuery = `
    SELECT * 
        FROM player_details;`;
  const getAllPlayersResponse = await db.all(getAllPlayersQuery);
  response.send(
    getAllPlayersResponse.map((eachPlayer) => convertPlayerDBObject(eachPlayer))
  );
});

//API 2

app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerIdQuery = `SELECT * FROM player_details 
    WHERE player_id =${playerId};`;
  const playerResponse = await db.get(getPlayerIdQuery);
  response.send(convertPlayerDBObject(playerResponse));
});

//API 3
app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const { playerName } = request.body;
  const updatePlayerNameQuery = `UPDATE player_details SET player_name ='${playerName}'
    WHERE player_id = ${playerId};`;
  await db.run(updatePlayerNameQuery);
  response.send("Player Details Updated");
});

//API 4
const convertMatchDetailsObject = (obj) => {
  return {
    matchId: obj.match_id,
    match: obj.match,
    year: obj.year,
  };
};

app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchDetailsQuery = ` 
    SELECT * 
        FROM match_details
    WHERE match_id=${matchId}`;
  const getMatchDetailsResponse = await db.get(getMatchDetailsQuery);
  response.send(convertMatchDetailsObject(getMatchDetailsResponse));
});

//API 5
app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  const getMatchesOfPlayerDBQuery = `
    SELECT *
        FROM player_match_score
    WHERE 
        player_id=${playerId};`;

  const getMatchesOfPlayerDBResponse = await db.all(getMatchesOfPlayerDBQuery);
const matchesIdArr = getMatchesOfPlayerDBResponse.map((eachMatch) => {
    return eachMatch.match_id;
  });

  const getMatchDetailsQuery = `
    SELECT *
        FROM match_details 
    WHERE match_id IN (${matchesIdArr});`;

  const fetchMatchDetailsResponse = await db.all(getMatchDetailsQuery);
  response.send(
    fetchMatchDetailsResponse.map((eachMatch) =>
      convertMatchDetailsObject(eachMatch)
    )
  );
});

//API 6
app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const getPlayersOfMatchQuery = `
    SELECT *
        FROM player_match_score
            NATURAL JOIN player_details
    WHERE match_id=${matchId};`;
  const getPlayersOfMatchResponse = await db.all(getPlayersOfMatchQuery);
  response.send(
    getPlayersOfMatchResponse.map((eachPlayer) =>
      convertPlayerDBObject(eachPlayer)
    )
  );
});

//API 7

const playerStatsObject = (playerName, statsObj) => {
  return {
    playerId: statsObj.player_id,
    playerName: playerName,
    totalScore: statsObj.totalScore,
    totalFours: statsObj.totalFours,
    totalSixes: statsObj.totalSixes,
  };
};

//GET Returns the statistics of the total score, fours, sixes
//  of a specific player based on the player ID

app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerNameQuery = `
    SELECT player_name
        FROM player_details
    WHERE player_id=${playerId};`;
  const getPlayerNameResponse = await db.get(getPlayerNameQuery);
  const getPlayerStatisticsQuery = `
    SELECT 
        player_id,
        sum(score) AS totalScore,
        sum(fours) AS totalFours,
        sum(sixes) AS totalSixes
    FROM 
        player_match_score
    WHERE 
        player_id=${playerId};`;

  const getPlayerStatisticsResponse = await db.get(getPlayerStatisticsQuery);
  response.send(
    playerStatsObject(
      getPlayerNameResponse.player_name,
      getPlayerStatisticsResponse
    )
  );
});

module.exports = app;
