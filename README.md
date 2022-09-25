# fabric-demo-app
Car asset tracking application build using hyperledger fabric

This demo application contains code for smart contract for car tracking application and APIs to invoke or query smart contract based methods.

# Smart contract implementation:

1. **CreateCar** - this method is used to create a car asset on Blockchain ledger after with car's manufacturing details

2. **DeliverCar** - this method is used to perform a delivery transaction on Blockchain after delivering car to the dealer

3. **SellCar** - this method is used to perform the sell transaction on Blockchain after the car is sold to customer

4. **ReadCar** - this method is used to fetch car's current world state


# API implementation: 

There are 6 APIs in this application for car tracking management and user management:

1. _**/register**_ - to register a new user in the application using Fabric-CA 

2. _**/users/login**_ - for authorising user's credentials and creating a session for the application

3. _**/createCar**_ - to invoke the CreateCar method from the smart contract

4. _**/deliverCar**_ - to invoke the DeliverCar method from the smart contract

5. _**/sellCar**_ - to invoke the SellCar method from the smart contract

6. _**/getCarDetails**_ - to call the ReadCar query method from the smart contract
 

