const axios = require("axios");

async function getAllUserCasts(fid) {
  try {
    if (fid) {
      const response = await axios.get(
        `https://api.neynar.com/v2/farcaster/feed?feed_type=filter&filter_type=fids&fids=${fid}&limit=88`,
        {
          headers: {
            api_key: process.env.NEYNAR_API_KEY,
          },
        }
      );
      return response.data.casts;
    } else {
      return [];
    }
  } catch (error) {
    console.log("there was an error getting all the user casts", error);
    return [];
  }
}

async function getAllUserFollowWithBios(fid) {
  try {
    if (fid) {
      const response = await axios.get(
        `https://api.neynar.com/v2/farcaster/followers?fid=${fid}&viewer_fid=18350&sort_type=desc_chron&limit=88`,
        {
          headers: {
            api_key: process.env.NEYNAR_API_KEY,
          },
        }
      );
      return response.data.users;
    } else {
      return [];
    }
  } catch (error) {
    console.log(
      "there was an error getting all the user follows with bios",
      error
    );
    return [];
  }
}

module.exports = { getAllUserCasts, getAllUserFollowWithBios };
