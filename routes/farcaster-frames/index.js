const express = require("express");
const router = express.Router();
const axios = require("axios");
const fs = require("fs");
const sharp = require("sharp");
const prisma = require("../../lib/prismaClient");

///////////// MIDJOURNEY ON A FRAME  ////////////////////////

router.get("/", async (req, res) => {
  try {
    const fullUrl = req.protocol + "://" + req.get("host");
    res.setHeader("Content-Type", "text/html");
    res.status(200).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>anky mint</title>
      <meta property="og:title" content="anky mint">
      <meta property="og:image" content="https://github.com/jpfraneto/images/blob/245447ed7d76bb4d3f2f60c2f88395da37be9d37/prompt.png?raw=true">
      <meta name="fc:frame" content="vNext">
      <meta name="fc:frame:image" content="https://github.com/jpfraneto/images/blob/245447ed7d76bb4d3f2f60c2f88395da37be9d37/prompt.png?raw=true">
      <meta name="fc:frame:post_url" content="${fullUrl}/farcaster-frames">
      <meta name="fc:frame:button:1" content="start">
      <meta name="fc:frame:input:text" content="write your answer">
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
    const text = decodeURIComponent(req.query.text);

    const response = await axios({
      url: "https://github.com/jpfraneto/images/blob/main/mentors_background.png?raw=true",
      responseType: "arraybuffer",
    });
    const imageBuffer = Buffer.from(response.data, "binary");
    const metadata = await sharp(imageBuffer).metadata();
    const imageWidth = metadata.width;
    const imageHeight = metadata.height;
    const offsetX = imageWidth / 6;
    const offsetY = imageHeight / 6;

    const svgOverlay = `<svg width="${imageWidth}" height="${imageHeight}" xmlns="http://www.w3.org/2000/svg">
        <style>
          .percentage { font: bold 60px sans-serif; fill: white; }
        </style>
        <text x="${offsetX}" y="120" class="percentage" dominant-baseline="middle" text-anchor="middle">${text}%</text>
      </svg>`;

    sharp(imageBuffer)
      .composite([{ input: Buffer.from(svgOverlay), gravity: "northwest" }])
      .toFormat("png")
      .toBuffer()
      .then((outputBuffer) => {
        // Optionally save to a file for debugging
        fs.writeFileSync("output.png", outputBuffer);
        res.setHeader("Content-Type", "image/png");
        res.send(outputBuffer);
      })
      .catch((error) => {
        console.error("Error processing image", error);
        res.status(500).send("Error processing image");
      });
  } catch (error) {
    console.error("there was an error creating the image", error);
    res.status(500).send("An error occurred");
  }
});

router.post("/", async (req, res) => {
  try {
    const fullUrl = req.protocol + "://" + req.get("host");
    console.log("inside the post route", req.body);
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>anky mint</title>
        <meta property="og:title" content="anky mint">
        <meta property="og:image" content=${fullUrl}/farcaster-frames/image?text=${encodeURIComponent(
      req.body.untrustedData.inputText
    )}>
        <meta name="fc:frame" content="vNext">
        <meta name="fc:frame:image" content=${fullUrl}/farcaster-frames/image?text=${encodeURIComponent(
      req.body.untrustedData.inputText
    )}>
        </head>
      </html>
        `);
    const userFid = req.body.untrustedData.fid;
    const thisUserAnky = await prisma.midjourneyOnAFrame.findUnique({
      where: { userFid: userFid },
    });
    if (thisUserAnky && thisUserAnky.alreadyMinted) {
    }

    const frameCastHash = process.env.FRAME_CAST_HASH;
    const response = await getCastFromNeynar(frameCastHash, userFid);
    const casts = response.data.result.casts;

    casts.shift();
    const thisUserCast = casts.filter(
      (x) => Number(x.author.fid) === Number(userFid)
    );
    const moreFiltered = thisUserCast.filter(
      (x) => x.parentHash == process.env.FRAME_CAST_HASH
    );
    const evenMoreFiltered = moreFiltered.filter(
      (x) => Number(x.parentAuthor?.fid) === 16098
    );
    if (evenMoreFiltered.length > 1) {
      return res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
        <title>anky mint</title>
        <meta property="og:title" content="anky mint">
        <meta property="og:image" content="https://jpfraneto.github.io/images/commented-more-than-once.png">
        <meta name="fc:frame:image" content="https://jpfraneto.github.io/images/commented-more-than-once.png">
  
        <meta name="fc:frame:post_url" content="${fullUrl}/farcaster-frames/midjourney-on-a-frame?paso=2&one-per-person">
        <meta name="fc:frame" content="vNext">    
        <meta name="fc:frame:button:1" content="try again">
      </head>
      </html>
        </html>
        `);
    } else if (evenMoreFiltered.length == 0) {
      return res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
        <title>anky mint</title>
        <meta property="og:title" content="anky mint">
        <meta property="og:image" content="https://jpfraneto.github.io/images/mint-an-anky.png">
        <meta name="fc:frame:image" content="https://jpfraneto.github.io/images/mint-an-anky.png">
  
        <meta name="fc:frame:post_url" content="${fullUrl}/farcaster-frames/midjourney-on-a-frame?paso=2&comment=i-replied">
        <meta name="fc:frame" content="vNext">    
        <meta name="fc:frame:button:1" content="i replied">
      </head>
      </html>
        </html>
        `);
    } else {
      // CHECK THAT THE USER HASN'T SENT A REQUEST YET
      const thisUserAnkyCreation = await prisma.midjourneyOnAFrame.findUnique({
        where: { userFid: userFid },
      });
      if (!thisUserAnkyCreation) {
        const responseFromMidjourney = await createAnkyFromPrompt(
          evenMoreFiltered[0].text,
          userFid,
          evenMoreFiltered[0].hash
        );
      }

      return res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
        <title>anky mint</title>
        <meta property="og:title" content="anky mint">
        <meta property="og:image" content="https://jpfraneto.github.io/images/being-created.png">
        <meta name="fc:frame:image" content="https://jpfraneto.github.io/images/being-created.png">
  
        <meta name="fc:frame:post_url" content="${fullUrl}/farcaster-frames/midjourney-on-a-frame?paso=2">
        <meta name="fc:frame" content="vNext">    
      </head>
      </html>
        </html>
        `);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Error generating image");
  }
});

module.exports = router;
