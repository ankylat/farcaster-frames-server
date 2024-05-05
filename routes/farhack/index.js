const express = require("express");
const router = express.Router();
const axios = require("axios");
const fs = require("fs");
const sharp = require("sharp");
const OpenAI = require("openai");
const prisma = require("../../lib/prismaClient");
const {
  getAllUserCasts,
  getAllUserFollowWithBios,
} = require("../../lib/neynar");

const openai = new OpenAI(process.env.OPENAI_API_KEY);

///////////// ACTIVATE THE BOT  ////////////////////////

const botName = "farhack gtp";
const thingName = "farhack-gtp";

router.get("/", async (req, res) => {
  try {
    const fullUrl = req.protocol + "://" + req.get("host");
    res.setHeader("Content-Type", "text/html");
    res.status(200).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${botName}</title>
      <meta property="og:title" content="${botName}">
      <meta property="og:image" content="https://github.com/jpfraneto/images/blob/main/first_frame_image.png?raw=true">
      <meta name="fc:frame" content="vNext">
      <meta name="fc:frame:image" content="https://github.com/jpfraneto/images/blob/main/first_frame_image.png?raw=true">
      <meta name="fc:frame:post_url" content="${fullUrl}/farhack">
      <meta name="fc:frame:button:1" content="activate">
    </head>
    </html>
    `);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error generating image");
  }
});

router.get("/image", async (req, res) => {
  try {
    const imageCopy = decodeURIComponent(req.query.text);

    const response = await axios({
      url: "https://github.com/jpfraneto/images/blob/main/first_frame_image.png?raw=true",
      responseType: "arraybuffer",
    });
    const imageBuffer = Buffer.from(response.data, "binary");
    const metadata = await sharp(imageBuffer).metadata();
    const imageWidth = metadata.width;
    const imageHeight = metadata.height;

    // approximate maximum characters per line based on the image width

    const maxCharsPerLine = Math.floor(imageWidth / 20); // rough estimate, adjust as needed

    function wrapText(text, maxChars) {
      const words = text.split(" ");
      const lines = [];
      let currentLine = words[0];

      words.slice(1).forEach((word) => {
        if (currentLine.length + word.length + 1 < maxChars) {
          currentLine += " " + word;
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      });

      lines.push(currentLine);
      return lines;
    }

    const lines = wrapText(imageCopy, maxCharsPerLine);
    const lineHeight = 48; // line height in pixels, corresponds to font size
    const svgTextElements = lines
      .map(
        (line, index) =>
          `<text x="12%" y="${
            25 + index * ((lineHeight / imageHeight) * 100)
          }%" class="text" dominant-baseline="hanging">${line}</text>`
      )
      .join("");

    const blackOverlay = `<svg width="${imageWidth}" height="${imageHeight}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="black" fill-opacity="0.6"></rect>
          <style>
            .text { font: bold 48px sans-serif; fill: white; text-anchor: start; }
          </style>
          ${svgTextElements}
        </svg>`;

    sharp(imageBuffer)
      .composite([{ input: Buffer.from(blackOverlay), gravity: "center" }])
      .toFormat("png")
      .toBuffer()
      .then((outputBuffer) => {
        // Optionally save to a file for debugging
        fs.writeFileSync("output_with_overlay.png", outputBuffer);
        res.setHeader("Content-Type", "image/png");
        res.send(outputBuffer);
      })
      .catch((error) => {
        console.error("Error processing image", error);
        res.status(500).send("Error processing image");
      });
  } catch (error) {
    console.error("There was an error creating the image", error);
    res.status(500).send("An error occurred");
  }
});

router.post("/", async (req, res) => {
  try {
    const user = await prisma.user.upsert({
      where: {
        fid: req.body.untrustedData.fid,
      },
      create: {
        fid: req.body.untrustedData.fid,
      },
      update: {},
    });
    console.log("the user is: ", user);
    if (!user.fetchedUserData) {
      const responseFromQueryingData = await queryUserDataFromNeynar(
        req.body.untrustedData.fid
      );
      if (!responseFromQueryingData.success) {
        setTimeout(async () => {
          await queryUserDataFromNeynar(req.body.untrustedData.fid);
        }, 5000);
      }
    }
    const fullUrl = req.protocol + "://" + req.get("host");
    const imageCopy = "how many replies do you want to receive daily?";
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${botName}</title>
        <meta property="og:title" content="farhack gtp">
        <meta property="og:image" content=${fullUrl}/farhack/bot-image?text=}>
        <meta name="fc:frame" content="vNext">
        <meta name="fc:frame:image" content=${fullUrl}/farhack/bot-image?text=${encodeURIComponent(
      imageCopy
    )}&userPrompt=${encodeURIComponent("welcome to farhack gtp")}>
        <meta name="fc:frame:post_url" content="${fullUrl}/farhack/second-frame" />
        <meta name="fc:frame:button:1" content="now" />
        <meta name="fc:frame:button:2" content="2" />
        <meta name="fc:frame:button:3" content="3" />
        <meta name="fc:frame:button:4" content="custom" />
        </head>
      </html>
        `);
  } catch (error) {
    console.error(error);
    imageCopy = "there was an error";
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${botName}</title>
        <meta property="og:title" content="farhack gtp">
        <meta property="og:image" content=${fullUrl}/farhack/bot-image?text=}>
        <meta name="fc:frame" content="vNext">
        <meta name="fc:frame:image" content=${fullUrl}/farhack/bot-image?text=${encodeURIComponent(
      imageCopy
    )}&userPrompt=${encodeURIComponent("welcome to farhack gtp")}>
        <meta name="fc:frame:post_url" content="${fullUrl}/farhack/second-frame" />
        <meta name="fc:frame:button:1" content="now" />
        <meta name="fc:frame:button:2" content="2" />
        <meta name="fc:frame:button:3" content="3" />
        <meta name="fc:frame:button:4" content="custom" />
        </head>
      </html>
        `);
  }
});

router.post("/second-frame", async (req, res) => {
  try {
    let imageCopy;
    const fullUrl = req.protocol + "://" + req.get("host");
    if (req.body.untrustedData.inputText) {
      let inputText = req.body.untrustedData.inputText;
      let isValidNumber = Number(inputText);
      if (isValidNumber) {
        if (isValidNumber < 11) {
          const response = await updateUserWithReplyFrequency(
            fid,
            isValidNumber
          );
          if (isValidNumber == 1) {
            createInstantaneousCastForThisUser(fid);
          }
          console.log("IN HERE");
          if (response.success) {
            imageCopy = `your preference is known. check your notifications.`;
          } else {
            imageCopy = `there was an error. please try again`;
          }
          return res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${botName}</title>
          <meta property="og:title" content="anky mint">
          <meta name="fc:frame" content="vNext">
          <meta name="fc:frame:image" content=${fullUrl}/farhack/bot-image?text=${encodeURIComponent(
            imageCopy
          )}&userPrompt=${encodeURIComponent("see you soon")}>
          </head>
        </html>
          `);
        } else {
          imageCopy = req.body.untrustedData.inputText;
          return res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${botName}</title>
          <meta property="og:title" content="anky mint">
          <meta property="og:image" content=${fullUrl}/farhack/image?text=}>
          <meta name="fc:frame" content="vNext">
          <meta name="fc:frame:image" content=${fullUrl}/farhack/image?text=${encodeURIComponent(
            imageCopy
          )}&userPrompt=${encodeURIComponent("")}>
          <meta name="fc:frame:post_url" content="${fullUrl}/farhack/second-frame" />
          <meta name="fc:frame:input:text" content="1 2 3 4 5 6 7 8 9" />
          <meta name="fc:frame:button:1" content="submit" />
          </head>
        </html>
          `);
        }
      } else {
        // this is the place
        imageCopy = req.body.untrustedData.inputText;
        return res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${botName}</title>
          <meta property="og:title" content="anky mint">
          <meta property="og:image" content=${fullUrl}/farhack/image?text=}>
          <meta name="fc:frame" content="vNext">
          <meta name="fc:frame:image" content=${fullUrl}/farhack/image?text=${encodeURIComponent(
          imageCopy
        )}>
          <meta name="fc:frame:post_url" content="${fullUrl}/farhack/second-frame" />
          <meta name="fc:frame:input:text" content="1 2 3 4 5 6 7 8 9" />
          <meta name="fc:frame:button:1" content="submit" />
          </head>
        </html>
          `);
      }
    }

    if ([1, 2, 3].includes(req.body.untrustedData.buttonIndex)) {
      if (Number(req.body.untrustedData.buttonIndex) == 1) {
        const responseFromReplying = await replyToThisUserRightNow(
          req.body.untrustedData.fid
        );
        if (responseFromReplying.success) {
          let thisHeader = `your wishes are my commands.`;
          imageCopy = `check your notifications`;
          return res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${botName}</title>
          <meta property="og:title" content="anky mint">
          <meta property="og:image" content=${fullUrl}/farhack/bot-image?text=}>
          <meta name="fc:frame" content="vNext">
          <meta name="fc:frame:image" content=${fullUrl}/farhack/bot-image?text=${encodeURIComponent(
            imageCopy
          )}&userPrompt=${encodeURIComponent(thisHeader)}>
          <meta name="fc:frame:post_url" content="${fullUrl}/farhack/second-frame" />
          </head>
        </html>
          `);
        }
      } else {
        imageCopy = "you will be surprised";
        return res.status(200).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${botName}</title>
            <meta property="og:title" content="anky mint">
            <meta property="og:image" content=${fullUrl}/farhack/bot-image?text=}>
            <meta name="fc:frame" content="vNext">
            <meta name="fc:frame:image" content=${fullUrl}/farhack/bot-image?text=${encodeURIComponent(
          imageCopy
        )}&userPrompt=${req.body.untrustedData.buttonIndex}>
            <meta name="fc:frame:post_url" content="${fullUrl}/farhack/second-frame" />
            </head>
          </html>
            `);
      }
    }

    imageCopy = "how many replies per day?";

    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${botName}</title>
        <meta property="og:title" content="anky mint">
        <meta property="og:image" content=${fullUrl}/farhack/image?text=}>
        <meta name="fc:frame" content="vNext">
        <meta name="fc:frame:image" content=${fullUrl}/farhack/image?text=${encodeURIComponent(
      imageCopy
    )}>
        <meta name="fc:frame:post_url" content="${fullUrl}/farhack/second-frame" />
        <meta name="fc:frame:input:text" content="1 2 3 4 5 6 7 8 9" />
        <meta name="fc:frame:button:1" content="submit" />
        </head>
      </html>
        `);
  } catch (error) {
    console.log("there was an error here", error);
  }
});

///////////// BOT ON A FRAME  ////////////////////////

///////////// BOT ON A FRAME  ////////////////////////

///////////// BOT ON A FRAME  ////////////////////////

///////////// BOT ON A FRAME  ////////////////////////

///////////// BOT ON A FRAME  ////////////////////////

///////////// BOT ON A FRAME  ////////////////////////

router.get("/bot-image", async (req, res) => {
  try {
    const imageCopy = decodeURIComponent(req.query.text); // This is the response
    const userPrompt = decodeURIComponent(req.query.userPrompt) || ""; // This is the prompt
    const imageWidth = 800; // Set your desired width
    const imageHeight = 600; // Set your desired height

    // Function to wrap text into lines
    function wrapText(text, maxChars) {
      const words = text.split(" ");
      const lines = [];
      let currentLine = words[0];

      words.slice(1).forEach((word) => {
        if (currentLine.length + word.length + 1 <= maxChars) {
          currentLine += " " + word;
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      });

      lines.push(currentLine);
      return lines;
    }

    // Wrapping the response text
    const lines = wrapText(imageCopy, Math.floor(imageWidth / 20)); // Adjust based on your font size
    const responsePositionStart = imageHeight * 0.5; // Start response in the middle of the image
    const svgResponseText = lines
      .map(
        (line, index) =>
          `<text x="4%" y="${
            (responsePositionStart / imageHeight) * 88 + index * 6
          }%" fill="white" font-family="sans-serif" font-size="28" font-weight="bold">${line}</text>`
      )
      .join("");

    // Creating SVG with both prompt and response
    const blackBackgroundSVG = `<svg width="${imageWidth}" height="${imageHeight}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${imageWidth} ${imageHeight}">
      <rect width="100%" height="100%" fill="black"></rect>
      <text x="4%" y="33%" fill="green" font-family="sans-serif" font-size="32" font-weight="bold">${userPrompt}</text>
      ${svgResponseText}
    </svg>`;

    const buffer = Buffer.from(blackBackgroundSVG);
    sharp(buffer)
      .toFormat("png")
      .toBuffer()
      .then((outputBuffer) => {
        fs.writeFileSync("output_with_overlay.png", outputBuffer);
        res.setHeader("Content-Type", "image/png");
        res.send(outputBuffer);
      })
      .catch((error) => {
        console.error("Error processing image", error);
        res.status(500).send("Error processing image");
      });
  } catch (error) {
    console.error("There was an error creating the image", error);
    res.status(500).send("An error occurred");
  }
});

router.get("/bot", async (req, res) => {
  try {
    const fullUrl = req.protocol + "://" + req.get("host");
    let imageCopy = `rate the reply. your response will be used anonymously as weight to fine tune this ai agent.`;

    // ADD A CONDITION FOR THE CAST ACTION: HAS THE USER ACTIVATED THE BOT? IF SO, CONTINUE WITH THIS FLOW. IF NOT, DISPLAY THE ORIGINAL FRAME TO ACTIVATE IT

    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${botName}</title>
        <meta property="og:title" content="anky mint">
        <meta name="fc:frame" content="vNext">
        <meta name="fc:frame:image" content=${fullUrl}/farhack/bot-image?text=${encodeURIComponent(
      imageCopy
    )}&userPrompt=${encodeURIComponent("welcome to farhack gtp")}>
        <meta name="fc:frame:post_url" content="${fullUrl}/farhack/bot" />
        <meta name="fc:frame:button:1" content="⭐️" />
        <meta name="fc:frame:button:2" content="⭐️⭐️" />
        <meta name="fc:frame:button:3" content="⭐️⭐️⭐️" />
        </head>
      </html>
        `);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error generating image");
  }
});

router.post("/bot", async (req, res) => {
  try {
    const fullUrl = req.protocol + "://" + req.get("host");
    res.setHeader("Content-Type", "text/html");
    let botResponse;

    let userText =
      req.body.untrustedData.inputText ||
      `you voted ${req.body.untrustedData.buttonIndex}.`;
    if (req.body.untrustedData.inputText) {
      botResponse = await talkToBot(userText);
    } else {
      botResponse = await getBotInitialReply(req.body.untrustedData.fid);
    }
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${botName}</title>
        <meta property="og:title" content="anky mint">
        <meta property="og:image" content=${fullUrl}/farhack/bot-image?text=${encodeURIComponent(
      botResponse
    )}}>
        <meta name="fc:frame" content="vNext">
        <meta name="fc:frame:image" content=${fullUrl}/farhack/bot-image?text=${encodeURIComponent(
      botResponse
    )}&userPrompt=${encodeURIComponent(userText)}>
        <meta name="fc:frame:post_url" content="${fullUrl}/farhack/bot" />
        <meta name="fc:frame:input:text" content="..." />
        <meta name="fc:frame:button:1" content="↑" />
        </head>
      </html>
        `);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error generating image");
  }
});

async function createInstantaneousCastForThisUser(fid) {
  try {
    const response = await prisma.user.findUnique({
      where: { fid: fid },
    });
    if (response) {
      const repliedToUser = await replyToThisUserRightNow(fid);
      console.log("the replied to user is: ", repliedToUser);
      // UPDATE THIS USER WITH A NEW REPLY IN THE ARRAY OF THE LAST 3 REPLIES. WE NEED TO CHECK IF THE AMOUNT OF REPLIES THAT THE USER HAS GOTTEN ON THE LAST DAY CORRESPONDS TO THIS NUMBER AND IF NOT SEGREGATE THEM INTO THE FUTURE WITH A CRON JOB THAT STAYS RUNNING
    } else {
      throw new Error(
        "there was an error creating the instantaneous cast for this user"
      );
    }
  } catch (error) {
    return { success: false };
  }
}

async function updateUserWithReplyFrequency(fid, replyFrequency) {
  try {
    const prismaResponse = await prisma.user.updateUnique({
      where: {
        fid: fid,
      },
      data: {
        replyFrequency: replyFrequency,
      },
    });
    return { success: true };
  } catch (error) {
    console.log("there was an error on the reply frequency", error);
    return { success: false };
  }
}

async function getBotInitialReply(userFid) {
  const userSpecificInformation = await getUserSpecificInformation(userFid);
  try {
    const messages = [
      {
        role: "system",
        content: `Say something funny to the user, but on a sarcastic language. your mission is to make the user smile.`,
      },
      { role: "user", content: "" },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-0125",
      messages: messages,
    });

    const dataResponse = completion.choices[0].message.content;
    return dataResponse;
  } catch (error) {
    return "hello world";
  }
}

async function getUserSpecificInformation(fid) {
  try {
    const user = await prisma.user.findUnique({
      where: { fid: fid },
    });
    return user;
  } catch (error) {
    console.log("there was an error here", error);
    return null;
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// async function getUserGroup() {
//   try {
//     console.log("inside the get user group function");
//     for (let i = 1; i < 20000; i++) {
//       await queryUserDataFromNeynar(i);
//       await delay(300); // Wait for 300 ms before the next iteration
//     }
//     console.log("FINISHED");
//   } catch (error) {
//     console.log("EEEEERRROR", error);
//   }
// }

// getUserGroup();

async function replyToThisUserRightNow(fid) {
  try {
    // find random cast from this user on the last 24 hours, or 48, or 72
    const randomCastFromThisUser = await getRandomCastFromUser(fid);
    const textForReplying = await findCastAndGetTextToReplyToUser(
      fid,
      randomCastFromThisUser
    );

    let castOptions = {
      text: textForReplying,
      embeds: [`https://farcaster-frames-server.onrender.com/farhack/bot`],
      parent: randomCastFromThisUser.hash,
      signer_uuid: process.env.NEYNAR_ANKY_SIGNER,
    };

    try {
      const response = await axios.post(
        "https://api.neynar.com/v2/farcaster/cast",
        castOptions,
        {
          headers: {
            api_key: process.env.NEYNAR_API_KEY,
          },
        }
      );
      return { success: true };
    } catch (error) {
      console.error(error);
      return { success: false };
    }
    return { success: true };
  } catch (error) {
    console.log("there was an error here", error);
    return { success: false };
  }
}

async function getRandomCastFromUser(fid) {
  try {
    const response = await axios.get(
      `https://api.neynar.com/v2/farcaster/feed?feed_type=filter&filter_type=fids&fids=${fid}&limit=88`,
      {
        headers: {
          api_key: process.env.NEYNAR_API_KEY,
        },
      }
    );
    const lastTenCasts = response.data.casts;
    const randomCast =
      lastTenCasts[Math.floor(lastTenCasts.length * Math.random())];
    return randomCast;
  } catch (error) {}
}

async function queryUserDataFromNeynar(fid) {
  fid = parseInt(fid, 10); // Ensure fid is an integer
  if (isNaN(fid)) {
    console.error("Invalid fid provided:", fid);
    return { success: false };
  }

  const allUserCastsText = [];
  const allUserFollowingBios = [];
  try {
    const allCastsFromUserNeynarResponse = await getAllUserCasts(fid);
    const allFollowsOfUserNeynarResponse = await getAllUserFollowWithBios(fid);

    for (let cast of allCastsFromUserNeynarResponse) {
      if (cast.text) allUserCastsText.push(cast.text);
    }
    for (let userFollow of allFollowsOfUserNeynarResponse) {
      if (userFollow.user.profile.bio.text)
        allUserFollowingBios.push(userFollow.user.profile.bio.text);
    }

    await prisma.user.upsert({
      where: { fid: fid },
      update: {
        fetchedUserData: true,
        casts: allUserCastsText.length
          ? allUserCastsText
          : ["No casts available."],
        followingBios: allUserFollowingBios.length
          ? allUserFollowingBios
          : ["No bios available."],
      },
      create: {
        fid: fid,
        fetchedUserData: true,
        casts: allUserCastsText,
        followingBios: allUserFollowingBios,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error in queryUserDataFromNeynar", error);
    return { success: false };
  }
}

async function findCastAndGetTextToReplyToUser(fid, randomCast) {
  try {
    const user = await prisma.user.findUnique({ where: { fid: fid } });
    const messages = [
      {
        role: "system",
        content: `Your mission is to tease the user. Please reply to this message with less than 300 characters, teasing the person that will read. This text will be replied to the following cast:`,
      },
      { role: "user", content: randomCast.text },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-0125",
      messages: messages,
    });

    const dataResponse = completion.choices[0].message.content;
    return dataResponse;
    // request al LLM : casts - bio - random selected cast
    // respuesta a ese cast en particular, un string de texto
  } catch (error) {}
}

async function talkToBot(userText) {
  try {
    const messages = [
      {
        role: "system",
        content: `You are a fun member of a social media network called Farcaster. You are interacting with the user through a farcaster frame, and your mission is to reply to what the user just said teasing her.`,
      },
      { role: "user", content: userText },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-0125",
      messages: messages,
    });

    const dataResponse = completion.choices[0].message.content;
    return dataResponse;
  } catch (error) {
    console.log("there was an error talking to the bot");
    return "";
  }
}

module.exports = router;
