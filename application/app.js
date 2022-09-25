'use strict';
const log4js = require('log4js');
const logger = log4js.getLogger('TrackingNetwork');
const bodyParser = require('body-parser');
const http = require('http')
const util = require('util');
const express = require('express')
const app = express();
const expressJWT = require('express-jwt');
const jwt = require('jsonwebtoken');
const bearerToken = require('express-bearer-token');
const cors = require('cors');
const constants = require('./config/constants.json')

const host = process.env.HOST || constants.host;
const port = process.env.PORT || constants.port;


const helper = require('./app/helper')
const invoke = require('./app/invoke')
const query = require('./app/query')

app.options('*', cors());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));
// set secret variable
app.set('secret', 'secretPass');
app.use(expressJWT({
    secret: 'secretPass'
}).unless({
    path: ['/users/login', '/register']
}));
app.use(bearerToken());

logger.level = 'debug';


app.use((req, res, next) => {
    logger.debug('New req for %s', req.originalUrl);
    if (req.originalUrl.indexOf('/users/login') >= 0 || req.originalUrl.indexOf('/register') >= 0) {
        return next();
    }
    var token = req.token;
    jwt.verify(token, app.get('secret'), (err, decoded) => {
        if (err) {
            console.log(`Error ================:${err}`)
            res.send({
                success: false,
                message: 'Failed to authenticate token. Make sure to include the ' +
                    'token returned from /users call in the authorization header ' +
                    ' as a Bearer token'
            });
            return;
        } else {
            req.username = decoded.username;
            req.orgname = decoded.orgName;
            logger.debug(util.format('Decoded from JWT token: username - %s, orgname - %s', decoded.username, decoded.orgName));
            return next();
        }
    });
});

var server = http.createServer(app).listen(port, function () { console.log(`Server started on ${port}`) });
logger.info('****************** SERVER STARTED ************************');
logger.info('***************  http://%s:%s  ******************', host, port);
server.timeout = 240000;

function getErrorMessage(field) {
    var response = {
        success: false,
        message: field + ' field is missing or Invalid in the request'
    };
    return response;
}

// Register and enroll user
app.post('/register', async function (req, res) {
    var username = req.body.username;
    var orgName = req.body.orgName;
    logger.debug('End point : /users');
    logger.debug('User name : ' + username);
    logger.debug('Org name  : ' + orgName);
    if (!username) {
        res.json(getErrorMessage('\'username\''));
        return;
    }
    if (!orgName) {
        res.json(getErrorMessage('\'orgName\''));
        return;
    }

    var token = jwt.sign({
        exp: Math.floor(Date.now() / 1000) + parseInt(constants.jwt_expiretime),
        username: username,
        orgName: orgName
    }, app.get('secret'));

    console.log(token)

    let response = await helper.registerAndGetSecret(username, orgName);

    logger.debug('-- returned from registering the username %s for organization %s', username, orgName);
    if (response && typeof response !== 'string') {
        logger.debug('Successfully registered the username %s for organization %s', username, orgName);
        response.token = token;
        res.json(response);
    } else {
        logger.debug('Failed to register the username %s for organization %s with::%s', username, orgName, response);
        res.json({ success: false, message: response });
    }

});

// Login and get jwt
app.post('/users/login', async function (req, res) {
    var username = req.body.username;
    var orgName = req.body.orgName;
    logger.debug('End point : /users');
    logger.debug('User name : ' + username);
    logger.debug('Org name  : ' + orgName);
    if (!username) {
        res.json(getErrorMessage('\'username\''));
        return;
    }
    if (!orgName) {
        res.json(getErrorMessage('\'orgName\''));
        return;
    }

    var token = jwt.sign({
        exp: Math.floor(Date.now() / 1000) + parseInt(constants.jwt_expiretime),
        username: username,
        orgName: orgName
    }, app.get('secret'));

    let isUserRegistered = await helper.isUserRegistered(username, orgName);

    if (isUserRegistered) {
        res.json({ success: true, message: { token: token } });

    } else {
        res.json({ success: false, message: `User with username ${username} is not registered with ${orgName}, Please register first.` });
    }
});


// Invoke transaction to call create Car function
app.post('/createCar', async function (req, res) {
    try {
        logger.debug('==================== INVOKE ON CHAINCODE ==================');
        
        //channel and chaincode names are hardcoded for this sample project, but if we want to pass it dynamically we can either pass them as query parameters or can decode them in user token
        var chaincodeName = "carTrackingCC";
        var channelName = "TrackingChannel";
        var args = [];
        args[0] = Math.floor(Math.random()*9000) + 1000;
        //req.body.model is an object so we have to stringify it
        args[1] = JSON.stringify(req.body.model);
        //req.body.manufacturer is an object so we have to stringify it
        args[2] = JSON.stringify(req.body.manufacturer);
        args[3] = req.body.unitCost;
        args[4] = req.body.ownerID;
        args[5] = "Manufacturer";
        
        if (!chaincodeName) {
            res.json(getErrorMessage('\'chaincodeName\''));
            return;
        }
        if (!channelName) {
            res.json(getErrorMessage('\'channelName\''));
            return;
        }
        if (!args[1]) {
            res.json(getErrorMessage('\'Model Details\''));
            return;
        }
        if (!args[2]) {
            res.json(getErrorMessage('\'Manufacturing Details\''));
            return;
        }
        if (!args[3]) {
            res.json(getErrorMessage('\'Unit Cost\''));
            return;
        }
        if (!args[4]) {
            res.json(getErrorMessage('\'Owner Id\''));
            return;
        }

        let message = await invoke.invokeTransaction(channelName, chaincodeName, "CreateCar", args, req.username, req.orgname);

        const response_payload = {
            result: message,
            error: null,
            errorData: null
        }
        res.send(response_payload);

    } catch (error) {
        const response_payload = {
            result: null,
            error: error.name,
            errorData: error.message
        }
        res.send(response_payload)
    }
});

// Invoke transaction to call deliver car function
app.post('/deliverCar', async function (req, res) {
    try {
        logger.debug('==================== INVOKE ON CHAINCODE ==================');
        
        //channel and chaincode names are hardcoded for this sample project, but if we want to pass it dynamically we can either pass them as query parameters or can decode them in user token
        var chaincodeName = "carTrackingCC";
        var channelName = "TrackingChannel";
        var args = [];
        args[0] = req.body.carId;
        //req.body.deliveryInfo is an object so we have to stringify it
        args[1] = JSON.stringify(req.body.deliveryInfo);
        args[2] = req.body.ownerID;
        
        if (!chaincodeName) {
            res.json(getErrorMessage('\'chaincodeName\''));
            return;
        }
        if (!channelName) {
            res.json(getErrorMessage('\'channelName\''));
            return;
        }
        if (!args[0]) {
            res.json(getErrorMessage('\'Car ID\''));
            return;
        }
        if (!args[1]) {
            res.json(getErrorMessage('\'Delivery Info\''));
            return;
        }
        if (!args[2]) {
            res.json(getErrorMessage('\'Owner ID\''));
            return;
        }

        let message = await invoke.invokeTransaction(channelName, chaincodeName, "DeliverCar", args, req.username, req.orgname);

        const response_payload = {
            result: message,
            error: null,
            errorData: null
        }
        res.send(response_payload);

    } catch (error) {
        const response_payload = {
            result: null,
            error: error.name,
            errorData: error.message
        }
        res.send(response_payload)
    }
});

// Invoke transaction to call sell car function
app.post('/sellCar', async function (req, res) {
    try {
        logger.debug('==================== INVOKE ON CHAINCODE ==================');
        
        //channel and chaincode names are hardcoded for this sample project, but if we want to pass it dynamically we can either pass them as query parameters or can decode them in user token
        var chaincodeName = "carTrackingCC";
        var channelName = "TrackingChannel";
        var args = [];
        args[0] = req.body.carId;
        //req.body.sellInfo is an object so we have to stringify it
        args[1] = JSON.stringify(req.body.sellInfo);
        args[2] = req.body.ownerID;
        
        if (!chaincodeName) {
            res.json(getErrorMessage('\'chaincodeName\''));
            return;
        }
        if (!channelName) {
            res.json(getErrorMessage('\'channelName\''));
            return;
        }
        if (!args[0]) {
            res.json(getErrorMessage('\'Car ID\''));
            return;
        }
        if (!args[1]) {
            res.json(getErrorMessage('\'Sell Info\''));
            return;
        }
        if (!args[2]) {
            res.json(getErrorMessage('\'Owner ID\''));
            return;
        }

        let message = await invoke.invokeTransaction(channelName, chaincodeName, "SellCar", args, req.username, req.orgname);

        const response_payload = {
            result: message,
            error: null,
            errorData: null
        }
        res.send(response_payload);

    } catch (error) {
        const response_payload = {
            result: null,
            error: error.name,
            errorData: error.message
        }
        res.send(response_payload)
    }
});

//api to fetch current state of the car using car's manufacturing ID
app.get('/getCarDetails', async function (req, res) {
    try {
        logger.debug('==================== QUERY ON CHAINCODE ==================');

        //channel and chaincode names are hardcoded for this sample project, but if we want to pass it dynamically we can either pass them as query parameters or can decode them in user token
        var channelName = "TrackingChannel";
        var chaincodeName = "carTrackingCC";
        var args = [];
        args[0] = req.body.carId;

        if (!chaincodeName) {
            res.json(getErrorMessage('\'chaincodeName\''));
            return;
        }
        if (!channelName) {
            res.json(getErrorMessage('\'channelName\''));
            return;
        }
        if (!args[0]) {
            res.json(getErrorMessage('\'Car ID\''));
            return;
        }

        let message = await query.query(channelName, chaincodeName, args, "ReadCar", req.username, req.orgname);

        const response_payload = {
            result: message,
            error: null,
            errorData: null
        }

        res.send(response_payload);

    } catch (error) {
        const response_payload = {
            result: null,
            error: error.name,
            errorData: error.message
        }
        res.send(response_payload)
    }
});
