import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(request: NextRequest, { params } : {params: {pid: string} }) {
  try {
    const client = await clientPromise;
    const db = client.db("ShadowrunDB2");
    const pid = params.pid;
    const sortOption = getSortOption(request.nextUrl.searchParams.get("sort") + '');
    const querySortDirection = (request.nextUrl.searchParams.get("dir") == "asc" ? 1 : -1);
    const playersPerLBPage = 20; // If changing, change the same var value in the leaderboard/[lbpage]/page.tsx file
    const skipAmount = Math.max(playersPerLBPage * (Number(pid) - 1), 0);
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 2);
    const players =
      await db.collection("players")
        .aggregate([
          {$project: {"_id": 0, "discordId": 1, "rating": 1, "wins": 1, "losses": 1, "lastMatchDate": 1}},
          {$match: {'lastMatchDate': {$gte: cutoffDate}}},
          {$addFields: {"ratio": {$round: [{$divide: ["$wins", {$add: ["$wins", "$losses"]}]}, 2]}}},
          {$sort: {[sortOption]: querySortDirection}}])
        .skip(skipAmount)
        .limit(playersPerLBPage)
        .toArray()

    const activePlayerCount = await db.collection("players").countDocuments({lastMatchDate: {$gte: cutoffDate}});


    return NextResponse.json({
      ok: true,
      players: players,
      playerCount: activePlayerCount,
      status: 201,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      message: "Error getting matches: " + error,
      status: 500,
    });
  }
}

const getSortOption = (sortParam: string) => {
  switch (sortParam) {
    case ("w"):
      return "wins";
    case ("l"):
      return "losses";
    case ("r"):
      return "ratio";
    case ("e"):
    default:
      return "rating";
  }
} 