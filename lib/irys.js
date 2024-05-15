const Irys = require("@irys/sdk");

const getIrys = async () => {
	const network = "mainnet";
	// Devnet RPC URLs change often, use a recent one from https://chainlist.org/
	const providerUrl = "";
	const token = "ethereum";
 
	const irys = new Irys({
		network, // "mainnet" or "devnet"
		token, // Token used for payment
		key: process.env.PRIVATE_KEY, // ETH or SOL private key
		config: { providerUrl }, // Optional provider URL, only required when using Devnet
	});
	return irys;
};

const uploadSessionToIrys = async (text) => {
	const irys = await getIrys();
    const tags = [{ name: "Content-Type", value: "text/plain" }, { name: "application-id", value: process.env.APPLICATION_ID },];
	try {
		const receipt = await irys.upload(text , { tags });
        console.log(`Data uploaded ==> https://gateway.irys.xyz/${receipt.id}`);
        return receipt.id
	} catch (e) {
		console.log("Error uploading data ", e);
	}
};

module.exports = {uploadSessionToIrys}