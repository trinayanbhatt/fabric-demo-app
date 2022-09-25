const { Gateway, Wallets, } = require('fabric-network');
const log4js = require('log4js');
const logger = log4js.getLogger('TrackingNetwork');


const helper = require('./helper')
const query = async (channelName, chaincodeName, args, fcn, username, org_name) => {

    try {

        const ccp = await helper.getCCP(org_name) //JSON.parse(ccpJSON);

        // Create a new file system based wallet for managing identities.
        const walletPath = await helper.getWalletPath(org_name) //.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // Check to see if we've already enrolled the user.
        let identity = await wallet.get(username);
        if (!identity) {
            console.log(`An identity for the user ${username} does not exist in the wallet, so registering user`);
            await helper.getRegisteredUser(username, org_name, true)
            identity = await wallet.get(username);
            return;
        }

        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet, identity: username, discovery: { enabled: true, asLocalhost: true }
        });

        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork(channelName);

        // Get the contract from the network.
        const contract = network.getContract(chaincodeName);
        let result;

        if(fcn=="ReadCar"){
            result = await contract.evaluateTransaction(fcn, args[0]);
        }
           
        result = JSON.parse(result.toString());
        return result
        
    } catch (error) {
        console.error(`Failed to evaluate transaction: ${error}`);
        return error.message

    }
}

exports.query = query