const axios = require("axios");
const OpenAI = require('openai')

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

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

async function fetchCastInformation(castHash) {
    try {
        const response = await axios.get(
            `https://api.neynar.com/v2/farcaster/cast?identifier=${castHash}&type=hash&viewer_fid=18350`,
            {
              headers: {
                api_key: process.env.NEYNAR_API_KEY,
              },
            }
          );
          return response.data.cast;
    } catch (error) {
        console.log("there was an error finding the cast information", error);
        return null;
    }
}

async function replyToThisCast(castHash, fullUrl) {
  try {
    const thisCast = await fetchCastInformation(castHash);
    const systemPrompt = "You are a witty, sarcastic ai agent, your response is half-assed and a little mean but always in the good spirit of having fun, the idea is to make the person laugh from your quick witted humor, replying over a social post for lols. Reply tot his message only with your reply. Your mission is to tease the user by replying to a post on a social media network called Farcaster.\n\nYou have a deep understanding of internet memetic culture, and you base your reply on that. Your mission is to be the best 'reply guy' on the whole network, and for that, you just have fun. That's the main point: to have fun.\n\nYour response needs to be less than 300 characters long. This is a strong boundary.";

    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            "role": "system",
            "content": [
              {
                "type": "text",
                "text": systemPrompt
              }
            ]
          },
          {
            "role": "user",
            "content": [
              {
                "type": "text",
                "text": thisCast.text
              }
            ]
          },
        ],
        temperature: 1,
        max_tokens: 256,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });

    let castOptions = {
        text: response.choices[0].message.content,
        embeds: [
          { url:`${fullUrl}/farhack/bot` },
        ],
        parent: castHash,
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
  } catch (error) {
    console.log("there was an error talking to the bo1t", error);
    return {success:false};
  }
}

async function talkToBot(userFid, userText) {
  // chat
  try {
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

async function processUserWriting(userWriting) {
    // chat
    try {
      const systemPrompt = `Distill the essence of the text that you are receiving -which was written by a human as a stream of consciousness- and transform it into three things:

      1. a reflection to the user, in less than 320 characters. your mission is to make the user see herself and her unconscious biases, which were expressed on this writing and are hidden below the surface of what was written.
      2. a prompt to create an image that represents the essence of what was written in here, using as the vehicle to convey the message a blue cartoon-ish character.
      3. the title of this image as if it was a piece of art (it is a piece of art), in less than 5 words.
        
      <CONTEXT>You are a reimagination of ramana maharshi, and your core mission is to invite the user that wrote this text into a process of self inquiry.</CONTEXT>
      <INSTRUCTION>Reply with a JSON object, with the following properties: reflectionToUser, imagePrompt, imageTitle.</INSTRUCTION>`;
  
      const dataResponse = await getCompletionFromLocalLLM(
        systemPrompt,
        userWriting
      );
      return dataResponse;
    } catch (error) {
      console.log("there was an error talking to the bo2t", error);
      return "";
    }
  }

async function castAnonymouslyWithFrame(text, irysReceiptHash, fullUrl) {
    try {
        console.log('inside the cast anonymously with frame function');
        let embeds = [];
        if(text.length > 320) {
            text = `${text.slice(0,300)}...`;
            embeds = [
                { url:`${fullUrl}/frames/cast?cid=${irysReceiptHash}` },
              ];
        }
        let castOptions = {
            text: text,
            embeds: embeds,
            parent: "https://warpcast.com/~/channel/anky",
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
            return { success: true, castHash: response.data.cast.hash };
        } catch (error) {
            console.error(error);
            return { success: false };
        }
      } catch (error) {
        console.log("there was an error talking to the bo1t", error);
        return {success:false};
      }
}

async function processThisTextThroughAnky(text){
    try {
        const responseFromAnky = await processUserWriting(text);
        return {responseFromAnky}
    } catch (error) {
        console.log("there was an error processing the text through anky", error);
        return {success:false};
    }
}

async function getAnkyImage(prompt) {
    try {
        const response = await axios.post(
            "",
            prompt,
            {
              headers: {
                api_key: process.env.NEYNAR_API_KEY,
              },
            }
          );
        try {
            return { success: true, imagineApiId: response.imagineApiId};
        } catch (error) {
            console.error(error);
            return { success: false };
        }
      } catch (error) {
        console.log("there was an error talking to the bo1t", error);
        return {success:false};
      }
}

module.exports = {
    getCompletionFromLocalLLM, 
    replyToThisCast,
    castAnonymouslyWithFrame,
    processThisTextThroughAnky, 
    getAnkyImage
}