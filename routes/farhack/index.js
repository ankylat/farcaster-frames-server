const express = require("express");
const router = express.Router();
const axios = require("axios");
const fs = require("fs");
const sharp = require("sharp");
const OpenAI = require("openai");

const openai = new OpenAI(process.env.OPENAI_API_KEY);

///////////// ACTIVATE THE BOT  ////////////////////////

const botName = `yiaju`;

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
      <meta name="fc:frame:button:1" content="activate ${botName}">
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

    // Approximate maximum characters per line based on the image width
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
    const fullUrl = req.protocol + "://" + req.get("host");
    const imageCopy = "times per day?";
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
        <meta name="fc:frame:button:1" content="1" />
        <meta name="fc:frame:button:2" content="2" />
        <meta name="fc:frame:button:3" content="3" />
        <meta name="fc:frame:button:4" content="custom" />
        </head>
      </html>
        `);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error generating image");
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
          imageCopy = `your preference is known. ${isValidNumber}.`;
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
          )}>
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
      imageCopy = `your preference is known. ${req.body.untrustedData.buttonIndex}.`;
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
          </head>
        </html>
          `);
    }

    imageCopy = "how many times per day you want to be roasted?";

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
        <meta name="fc:frame:button:4" content="⭐️⭐️⭐️⭐️" />
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
    console.log("in heeeere", req.body);
    if (req.body.untrustedData.buttonIndex == 2) {
      return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${botName}</title>
        <meta property="og:title" content="anky mint">
        <meta property="og:image" content=${fullUrl}/farhack/bot-image?text=${encodeURIComponent(
        "this image should have been minted on degen chain, with us sponsoring gas. but we are not there yet, so please wait a while."
      )}}>
        <meta name="fc:frame" content="vNext">
        <meta name="fc:frame:image" content=${fullUrl}/farhack/bot-image?text=${encodeURIComponent(
        "this image should have been minted on degen chain, with us sponsoring gas. but we are not there yet, so please wait a while."
      )}&userPrompt=${encodeURIComponent("mint using degen chain")}>
        </head>
      </html>
        `);
    }
    let botResponse;

    let userText =
      req.body.untrustedData.inputText ||
      `you voted ${req.body.untrustedData.buttonIndex}.`;
    if (req.body.untrustedData.inputText) {
      botResponse = await talkToBot(userText);
    } else {
      botResponse = await getBotInitialReply(req.body.untrustedData.fid);
    }
    console.log("la primera ruta");
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
        <meta name="fc:frame:button:2" content="mint" />
        </head>
      </html>
        `);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error generating image");
  }
});

async function getBotInitialReply(userFid) {
  try {
    const messages = [
      {
        role: "system",
        content: `You need to distill context of the person that you are interacting based on her social graph on farcaster, and their interactions with the protocol in the form of casts, recasts and replies. The fid of that person is ${userFid}. Reply just with a one sentence inquiry that invites the person to think critically. Nothing more, nothing less. Be sharp and precise.`,
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
