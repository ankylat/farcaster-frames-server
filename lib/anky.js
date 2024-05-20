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
        const neynarResponse = await axios.get(
            `https://api.neynar.com/v2/farcaster/cast?identifier=${castHash}&type=hash&viewer_fid=16098`,
            {
              headers: {
                api_key: process.env.NEYNAR_API_KEY,
              },
            }
          );
          return neynarResponse.data.cast.text;
        
    } catch (error) {
        try {
            const pinataResponse = await axios.get(
                `https://api.pinata.cloud/v3/farcaster/casts/${castHash}`,
                {
                    headers: {
                        api_key: process.env.NEYNAR_API_KEY,
                        Authorization: `Bearer ${process.env.PINATA_JWT}`
                    },
                }
            );
            return pinataResponse.data.cast.content;
        } catch (error) {
            console.log(`this was a really hard to get cast. it didnt want to be replied to: ${castHash}`);
            return ""
        }        
      
    }
}

async function replyToThisCast(castHash, fullUrl = process.env.SERVER_API_ROUTE , casterFid = 18350) {
  try {
    const thisCastText = await fetchCastInformation(castHash);
    const systemPromptVersionOne = "You are a witty, sarcastic ai agent, your response is half-assed and a little mean but always in the good spirit of having fun, the idea is to make the person laugh from your quick witted humor, replying over a social post for lols. Reply tot his message only with your reply. Your mission is to tease the user by replying to a post on a social media network called Farcaster.\n\nYou have a deep understanding of internet memetic culture, and you base your reply on that. Your mission is to be the best 'reply guy' on the whole network, and for that, you just have fun. That's the main point: to have fun.\n\nYour response needs to be less than 300 characters long. This is a strong boundary.";

    const systemPrompt = "You are an insightful and engaging AI agent, and your mission is to distill the essence of what the user is saying on this social media post and generate a reply that serves as a reflection of the user. Your response should be thoughtful, positive, and contribute to a meaningful conversation. Your mission is to provide replies that enrich the user's experience on the social media network called Farcaster.\n\nYou have a deep understanding of internet culture and aim to foster a sense of community and connection. Your goal is to be the most appreciated 'reply gal' on the whole network by adding value to the discussions.\n\nYour response needs to be less than 300 characters long. This is a strong boundary. You can decide to inquiry the user using a question, or just write a reflection based on what the user wrote.";


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
                "text": thisCastText
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
    const replyText = response.choices[0].message.content;
    let castOptions = {
        text: replyText,
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
        try {
            // cast through pinata api
            const response = await axios.post(
                'https://api.pinata.cloud/v3/farcaster/casts',
                castOptions,
                {
                  headers: {
                    api_key: process.env.NEYNAR_API_KEY,
                  },
                }
              );
              return { success: true };
        } catch (error) {
            return { success: false }
        }
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