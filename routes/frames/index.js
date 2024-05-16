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

router.get("/image", async (req, res) => {
    try {
      const responseFromIrys = await axios.get(`https://node1.irys.xyz/${req.query.cid || ""}`);
      const text = responseFromIrys.data;
      const imageWidth = 800;
      const imageHeight = 800;
  
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
  
      const lines = wrapText(text, Math.floor(imageWidth / 20));
      const responsePositionStart = imageHeight * 0.11;
      const svgResponseText = lines
        .map(
          (line, index) =>
            `<text x="4%" y="${
              (responsePositionStart / imageHeight) * 80 + index * 5
            }%" fill="white" font-family="sans-serif" font-size="28" font-weight="bold">${line}</text>`
        )
        .join("");
  
      const svgContent = `<svg width="${imageWidth}" height="${imageHeight}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${imageWidth} ${imageHeight}">
  
        <rect width="100%" height="100%" fill="black"></rect>
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
  

  router.get("/cast", async (req, res) => {
    try {
      console.log("the req.query is: ", req.query)
      const fullUrl = req.protocol + "://" + req.get("host");
      res.setHeader("Content-Type", "text/html");
      res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>anky</title>
        <meta property="og:title" content="anky">
        <meta property="og:image" content="https://github.com/jpfraneto/images/blob/main/shhhe.png?raw=true">
        <meta name="fc:frame" content="vNext">
        <meta name="fc:frame:image" content="https://github.com/jpfraneto/images/blob/main/shhhe.png?raw=true">
        <meta name="fc:frame:post_url" content="${fullUrl}/frames/cast?cid=${req.query.cid || ""}">
        <meta name="fc:frame:button:1" content="read on...">
      </head>
      </html>
      `);
    } catch (error) {
      console.error(error);
      res.status(500).send("Error generating image");
    }
  });

  router.post("/cast", async (req, res) => {
    try {
      const fullUrl = req.protocol + "://" + req.get("host");
      const fullAddUrl = `https://warpcast.com/~/add-cast-action?url=${encodeURIComponent(`${process.env.SERVER_API_ROUTE}/invokeanky`)}`;

      console.log('the full add url is: ', fullAddUrl)
      res.setHeader("Content-Type", "text/html");
      res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>anky</title>
        <meta property="og:title" content="anky">
        <meta property="og:image" content="${fullUrl}/frames/image?cid=${req.query.cid || ""}">
        <meta name="fc:frame" content="vNext">
        <meta name="fc:frame:image" content="${fullUrl}/frames/image?cid=${req.query.cid || ""}">
        <meta name="fc:frame:image:aspect_ratio" content="1:1">
        <meta name="fc:frame:button:1" content="install invoke anky">
        <meta name="fc:frame:button:1:action" content="link" />
        <meta name="fc:frame:button:1:target" content="${
            fullAddUrl
          }" />
      </head>
      </html>
      `);
    } catch (error) {
      console.error(error);
      res.status(500).send("Error generating image");
    }
  });

module.exports = router;
