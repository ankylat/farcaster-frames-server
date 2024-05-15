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

const botName = "snarky";

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
      <meta property="og:image" content="https://github.com/jpfraneto/images/blob/main/rate-my-reply.png?raw=true">
      <meta name="fc:frame" content="vNext">
      <meta name="fc:frame:image" content="https://github.com/jpfraneto/images/blob/main/rate-my-reply.png?raw=true">
      <meta name="fc:frame:post_url" content="${fullUrl}/farhack">
      <meta name="fc:frame:image:aspect_ratio" content="1:1">
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
    console.log("time to get an image here", req.query)
    const imageCopy = decodeURIComponent(req.query.text) || "";
    const userPrompt = decodeURIComponent(req.query.userPrompt) || "";
    const imageWidth = 800;
    const imageHeight = 600;

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

    const lines = wrapText(imageCopy, Math.floor(imageWidth / 20));
    const responsePositionStart = imageHeight * 0.5;
    const svgResponseText = lines
      .map(
        (line, index) =>
          `<text x="4%" y="${
            (responsePositionStart / imageHeight) * 80 + index * 6
          }%" fill="white" font-family="sans-serif" font-size="28" font-weight="bold">${line}</text>`
      )
      .join("");

    const svgContent = `<svg width="${imageWidth}" height="${imageHeight}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${imageWidth} ${imageHeight}">

      <rect width="100%" height="100%" fill="black"></rect>
      <text x="10%" y="28%" fill="green" font-family="sans-serif" font-size="32" font-weight="bold">${userPrompt}</text>
      ${svgResponseText}
    </svg>`;

    const buffer = Buffer.from(svgContent);
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

router.post("/", async (req, res) => {
  try {
    const fullUrl = req.protocol + "://" + req.get("host");
    let imageCopy;
    const user = await prisma.user.upsert({
      where: {
        fid: req.body.untrustedData.fid,
      },
      create: {
        fid: req.body.untrustedData.fid,
      },
      update: {},
    });
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
    imageCopy = "how many replies do you want to receive daily?";
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${botName}</title>
        <meta property="og:title" content="farhack gtp">
        <meta property="og:image"  content=${fullUrl}/farhack/image?text=${encodeURIComponent(
          imageCopy
        )}&userPrompt=${encodeURIComponent("welcome to farhack gtp")}>
        <meta name="fc:frame" content="vNext">
        <meta name="fc:frame:image" content=${fullUrl}/farhack/bot-image?text=${encodeURIComponent(
      imageCopy
    )}&userPrompt=${encodeURIComponent("welcome to farhack gtp")}>
        <meta name="fc:frame:post_url" content="${fullUrl}/farhack/second-frame" />
        <meta name="fc:frame:button:1" content="now" />
        <meta name="fc:frame:button:2" content="2" />
        <meta name="fc:frame:button:3" content="3" />
        <meta name="fc:frame:button:4" content="none" />
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
        <meta name="fc:frame:button:4" content="none" />
        </head>
      </html>
        `);
  }
});

router.post("/second-frame", async (req, res) => {
  try {
    let imageCopy;
    const fullUrl = req.protocol + "://" + req.get("host");
    let millisecondsPerHours = 8 * 60 * 60 * 1000;
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
          if (response.success) {
            imageCopy = `your preference is known.`;
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
          <meta property="og:image" content=${fullUrl}/farhack/bot-image}>
          <meta name="fc:frame" content="vNext">
          <meta name="fc:frame:image" content=${fullUrl}/farhack/bot-image?text=${encodeURIComponent(
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
        imageCopy = req.body.untrustedData.inputText;
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
          req.body.untrustedData.fid, fullUrl
        );
      } else if (Number(req.body.untrustedData.buttonIndex) == 2) {
        await replyToThisUserRightNow(req.body.untrustedData.fid, fullUrl);
        setTimeout(() => {
          replyToThisUserRightNow(req.body.untrustedData.fid, fullUrl);
        }, (millisecondsPerHours * 6) / 10);
      } else if (Number(req.body.untrustedData.buttonIndex) == 3) {
        await replyToThisUserRightNow(req.body.untrustedData.fid, fullUrl);
        setTimeout(() => {
          replyToThisUserRightNow(req.body.untrustedData.fid, fullUrl);
        }, millisecondsPerHours * 2);
        setTimeout(() => {
          replyToThisUserRightNow(req.body.untrustedData.fid, fullUrl);
        }, millisecondsPerHours * 3);
      }
      let theUserPrompt = "your wishes are my commands.";
      imageCopy = "you have been notified";
      return res.status(200).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${botName}</title>
            <meta property="og:title" content="farhack bot">
            <meta property="og:image" content=${fullUrl}/farhack/bot-image?text=${encodeURIComponent(
              imageCopy
            )}&userPrompt=${theUserPrompt}>
            <meta name="fc:frame" content="vNext">
            <meta name="fc:frame:image" content=${fullUrl}/farhack/bot-image?text=${encodeURIComponent(
        imageCopy
      )}&userPrompt=${encodeURIComponent(
        theUserPrompt
      )}>
            <meta name="fc:frame:post_url" content="${fullUrl}/farhack/second-frame" />
            </head>
          </html>
            `);
    }

    imageCopy = "are you sure?";
    let lastMessage = "you are missing a lot of fun";
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
    )}&userPrompt=${encodeURIComponent(lastMessage)}>
        <meta name="fc:frame:post_url" content="${fullUrl}/farhack/third-frame" />
        <meta name="fc:frame:button:1" content="give up" />
        <meta name="fc:frame:button:2" content="maybe not" />
        </head>
      </html>
        `);
  } catch (error) {
    console.log("there was an error here", error);
  }
});

router.post("/third-frame", async (req, res) => {
  try {
    let imageCopy;
    const fullUrl = req.protocol + "://" + req.get("host");
    if (req.body.untrustedData.buttonIndex == 1) {
      let gameOver = "game over";
      imageCopy = "you wont get more replies from me";
      let theUserPrompt = "";
      return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${botName}</title>
        <meta property="og:title" content="anky mint">
        <meta property="og:image" content=${fullUrl}/farhack/bot-image?text=${encodeURIComponent(
          imageCopy
        )}&userPrompt=${theUserPrompt}>
        <meta name="fc:frame" content="vNext">
        <meta name="fc:frame:image" content=${fullUrl}/farhack/bot-image?text=${encodeURIComponent(
        imageCopy
      )}&userPrompt=${gameOver}>
        <meta name="fc:frame:post_url" content="${fullUrl}/farhack" />
        <meta name="fc:frame:button:1" content="i changed my mind" />
        </head>
      </html>
        `);
    } else {
      imageCopy = "how many replies do you want to receive daily?";
      return res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${botName}</title>
          <meta property="og:title" content="farhack gtp">
          <meta name="fc:frame" content="vNext">
          <meta name="fc:frame:image" content=${fullUrl}/farhack/bot-image?text=${encodeURIComponent(
        imageCopy
      )}&userPrompt=${encodeURIComponent("welcome to farhack gtp")}>
          <meta name="fc:frame:post_url" content="${fullUrl}/farhack/second-frame" />
          <meta name="fc:frame:button:1" content="now" />
          <meta name="fc:frame:button:2" content="2" />
          <meta name="fc:frame:button:3" content="3" />
          <meta name="fc:frame:button:4" content="none" />
          </head>
        </html>
          `);
    }
  } catch (error) {
    console.log("there was an error", error);
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
    const imageCopy = decodeURIComponent(req.query.text);
    const userPrompt = decodeURIComponent(req.query.userPrompt) || "";
    const step = parseInt(req.query.stepOfImage, 10) || 1;
    const imageWidth = 800;
    const imageHeight = 600;

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

    const lines = wrapText(imageCopy, Math.floor(imageWidth / 20));
    const responsePositionStart = imageHeight * 0.5;
    const svgResponseText = lines
      .map(
        (line, index) =>
          `<text x="4%" y="${
            (responsePositionStart / imageHeight) * 80 + index * 6
          }%" fill="white" font-family="sans-serif" font-size="28" font-weight="bold">${line}</text>`
      )
      .join("");

    const circleRadius = 8;
    const circleSpacing = 30; // 20px between circles
    const circleDiameter = circleRadius * 2;
    const circleBaseX = imageWidth / 2 - (circleDiameter + circleSpacing); // Adjusted for center alignment

    const circlesSVG = Array.from({ length: 4 })
      .map((_, i) => {
        const xPosition = circleBaseX + i * (circleDiameter + circleSpacing);
        const fill = i + 1 <= step ? "white" : "none";
        return `<circle cx="${xPosition}" cy="80%" r="${circleRadius}" fill="${fill}" stroke="white" stroke-width="2"/>`;
      })
      .join("");

    const svgContent = `<svg width="${imageWidth}" height="${imageHeight}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${imageWidth} ${imageHeight}">
      <rect width="100%" height="100%" fill="black"></rect>
      <text x="4%" y="28%" fill="green" font-family="sans-serif" font-size="32" font-weight="bold">${userPrompt}</text>
      ${svgResponseText}
      ${circlesSVG}
    </svg>`;

    const buffer = Buffer.from(svgContent);
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

    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${botName}</title>
        <meta property="og:title" content="anky mint">
        <meta name="fc:frame" content="vNext">
        <meta name="fc:frame:image" content="https://github.com/jpfraneto/images/blob/main/rate-my-reply.png?raw=true">
        <meta name="fc:frame:post_url" content="${fullUrl}/farhack/bot?stepOfImage=2" />
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
    let botResponse;
    const fullUrl = req.protocol + "://" + req.get("host");
    res.setHeader("Content-Type", "text/html");
    const stepOfImage = Number(req.query.stepOfImage) || 1;
    if (stepOfImage == 4) {
      const remainingReplies = await talkToBot(
        req.body.untrustedData.fid, req.body.untrustedData.inputText
      );
      botResponse = "see you soon";
      return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${botName}</title>
        <meta property="og:title" content="snarky">
        <meta property="og:image" content=${fullUrl}/farhack/bot-image?text=${encodeURIComponent(
        botResponse
      )}}>
        <meta name="fc:frame" content="vNext">
        <meta name="fc:frame:image" content=${fullUrl}/farhack/bot-image?text=${encodeURIComponent(
        remainingReplies
      )}&userPrompt=${encodeURIComponent(
        req.body.untrustedData.inputText
      )}&stepOfImage=${stepOfImage}>
        <meta name="fc:frame:post_url" content="${fullUrl}/farhack/bot?stepOfImage=${
        stepOfImage + 1
      }" />
        </head>
      </html>
        `);
    }

    let userText = stepOfImage == "2" ? "any additional comments?" : req.body.untrustedData.inputText;
    if (req.body.untrustedData.inputText) {
      botResponse = await talkToBot(req.body.untrustedData.fid, userText);
    } else {
      botResponse = ''
    }
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${botName}</title>
        <meta property="og:title" content="snarky">
        <meta name="fc:frame" content="vNext">
        <meta name="fc:frame:image" content=${fullUrl}/farhack/bot-image?text=${encodeURIComponent(
      botResponse
    )}&userPrompt=${encodeURIComponent(userText)}&stepOfImage=${stepOfImage}>
        <meta name="fc:frame:post_url" content="${fullUrl}/farhack/bot?stepOfImage=${
      stepOfImage + 1
    }" />
        <meta name="fc:frame:input:text" content="write your comments to Anky here..." />
        <meta name="fc:frame:button:1" content="send" />
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
    return { success: true };
  } catch (error) {
    console.log("there was an error on the reply frequency", error);
    return { success: false };
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

async function replyToThisUserRightNow(fid, fullUrl) {
  try {
    // find random cast from this user on the last 24 hours, or 48, or 72
    const randomCastFromThisUser = await getRandomCastFromUser(fid);
    if(randomCastFromThisUser) {
        console.log("the random cast from this user is ", randomCastFromThisUser)
        const textForReplying = await findCastAndGetTextToReplyToUser(
          fid,
          randomCastFromThisUser
        );
    
    
        let castOptions = {
          text: textForReplying,
          embeds: [
            { url:`${fullUrl}/farhack/bot` },
          ],
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
    } else {
      console.log("there was no cast found for this user ", fid)
    }
   
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
    if(response?.data?.casts){
      const lastTenCasts = response.data.casts;
      const randomCast =
        lastTenCasts[Math.floor(lastTenCasts.length * Math.random())];
      return randomCast;
    } else {
      return {}
    }
  } catch (error) {
    console.log("there was an error retrieveing the users casts from neynar", error)
    return ""
  }
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

// Assuming your local LLM server is running on http://localhost:8000 and has an endpoint /v1/completions
const LLM_SERVER_URL = "http://localhost:8000/v1/completions";

function createChatTemplate(systemPrompt, userQuery) {
  const chatTemplate = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n${systemPrompt}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n${userQuery}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`;
  return chatTemplate;
}

// todo: function with chat history
function createChatTemplateHistory(systemPrompt, userQuery, history) {
  let chat = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n${systemPrompt}<|eot_id|>`
  // history es tuplas user,ai
  for (tupleElement of history){
    chat+= `<|start_header_id|>user<|end_header_id|>\n\n${tupleElement.user}<|eot_id|>`
    chat+= `<|start_header_id|>assistant<|end_header_id|>\n\n${tupleElement.ai}<|eot_id|>`
  }
  chat+= `<|start_header_id|>user<|end_header_id|>\n\n${userQuery}<|eot_id|>`
  return chat;
}


async function getCompletionFromLocalLLM(systemPrompt, text) {
  try {
    // Send a POST request to your local LLM server
    const response = await axios.post(
      LLM_SERVER_URL,
      {
        model: "meta-llama/Meta-Llama-3-8B-Instruct",
        prompt: createChatTemplate(systemPrompt, text),
        max_tokens: 70,
        temperature: 0.1,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const completion = response.data.choices[0].text;
    return completion;
  } catch (error) {
    console.error("Error:", error);
    console.log("the error issssss ", error)
    return "Failed to get completion from local LLM.";
  }
}

///////////***************************************/

async function getBotInitialReply(userFid,userChoice) {
  // first in chat after stars
  // const userSpecificInformation = await getUserSpecificInformation(userFid);
  try {
    const user = await prisma.user.findUnique({ where: { fid: userFid } });

    const systemPrompt = `You are a witty, sarcastic chatbot, your response is half-assed and a little mean but always in the good spirit of having fun, you replied over a social post for fun and laughs. Your mission was to tease the user by replying to a post we selected.
    <CONTEXT>This were some of the recent user posts ${user.casts.join(', ')} and
    the descriptions (bios) of the most relevant people that this user was following: ${user.followingBios.join(', ')} You have already replied and the user wants to chat.</CONTEXT>`;

    const dataResponse = await getCompletionFromLocalLLM(systemPrompt, 
      `<INSTRUCTION>Give an ice-breaker text to intrigue and make the person chat under 250 characters, teasing the person that will read. Repeat only with your reply.
      Don't confront the user with this info, but in your previous fun reply the user rated you in a scale of 1,2,3 and chose ${userChoice}</INSTRUCTION>`
      
    );
    return dataResponse;
  } catch (error) {
    return "hello world";
  }
}

async function findCastAndGetTextToReplyToUser(userFid, randomCast) {
  // first LLM call to reply
  try {
    const user = await prisma.user.findUnique({ where: { fid: userFid } });
    
    const systemPrompt = `You are a witty, sarcastic chatbot, your response is half-assed and a little mean but always in the good spirit of having fun, the idea is to make the person laugh from your quick witted humor, replying over a social post for lols. Reply only with your reply. Your mission is to tease the user by replying to a post selected.
    <CONTEXT>This is some of the recent user posts ${user.casts.join(', ')} and
    the descriptions (bios) of the most relevant people that this user follows are: ${user.followingBios.join(', ')}.</CONTEXT>`;
    const dataResponse = await getCompletionFromLocalLLM(
      systemPrompt,
      `<INSTRUCTION>Please reply to the message input with less than 250 characters, only with the reply, teasing the person that will read. Your answer will be the reply to the following cast:${randomCast.text}</INSTRUCTION>`
    );

    return dataResponse;
  } catch (error) {
    console.log("there was an error talking to the bo1t", error);
    return "";
  }
}

async function talkToBot(userFid, userText) {
  // chat
  try {
    const user = await prisma.user.findUnique({ where: { fid: userFid } });
    const systemPrompt = `reply something funny to the motherfucking user. You are a witty, sarcastic chatbot, your response is half-assed and a little mean but always in the good spirit of having fun, you replied a user's social post for fun and laughs. Your mission was to tease the user by replying to a post we selected.
    <CONTEXT>This were some of the recent user posts ${user.casts.join(', ')}. You have already replied to the user, and he has started chatting with you voluntarily. Reply only with your reply.</CONTEXT>
    <INSTRUCTION>Please reply to the user's latest chat message, only with the reply, with less than 250 characters</INSTRUCTION>`;

    const dataResponse = await getCompletionFromLocalLLM(
      systemPrompt,
      userText
    );
    return dataResponse;
  } catch (error) {
    console.log("there was an error talking to the bo2t", error);
    return "";
  }
}

module.exports = router;
