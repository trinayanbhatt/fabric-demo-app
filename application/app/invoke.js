const { Gateway, Wallets} = require('fabric-network');
const path = require("path")

const helper = require('./helper');

const invokeTransaction = async (channelName, chaincodeName, fcn, args, username, org_name) => {
    try {
        const ccp = await helper.getCCP(org_name);

        const walletPath = await helper.getWalletPath(org_name);
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        
        let identity = await wallet.get(username);
        if (!identity) {
            console.log(`An identity for the user ${username} does not exist in the wallet, so registering user`);
            await helper.getRegisteredUser(username, org_name, true)
            identity = await wallet.get(username);
            console.log('Run the registerUser.js application before retrying');
            return;
        }


        const connectOptions = {
            wallet, identity: username, discovery: { enabled: true, asLocalhost: true }
        }

        const gateway = new Gateway();
        await gateway.connect(ccp, connectOptions);

        const network = await gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);

        let result;
        let message;

        switch (fcn) {
            case "CreateCar":
                result = await contract.submitTransaction(fcn, args[0], args[1], args[2], args[3], args[4], args[5]);
                message = `Car with Manufacturing ID ${args[0]} has been manufactured successfully`
                break;
            case "DeliverCar":
                result = await contract.submitTransaction(fcn, args[0], args[1], args[2]);
                message = `Car with Manufacturing ID ${args[0]} has been delivered successfully`
                break;
            case "SellCar":
                result = await contract.submitTransaction(fcn, args[0], args[1], args[2]);
                message = `Car with Manufacturing ID ${args[0]} has been sold successfully`
                break;
            default:
                break;
        }

        await gateway.disconnect();

        result = JSON.parse(result.toString());

        let response = {
            message: message,
            result : result
        }

        return response;


    } catch (error) {

        console.log(`Getting error: ${error}`)
        return error.message

    }
}

exports.invokeTransaction = invokeTransaction;