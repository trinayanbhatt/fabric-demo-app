/*
 * SPDX-License-Identifier: Apache-2.0
 */

const stringify  = require('json-stringify-deterministic');
const { Contract } = require('fabric-contract-api');

class AssetTracking extends Contract {

    // CreateCar adds a new car in the car asset model
    async CreateCar(ctx, id, model, manufacturer, unitCost, owner, ownerType) {
        const exists = await this.CarExists(ctx, id);
        if (exists) {
            throw new Error(`The car with manufacturing Id ${id} already exists`);
        }

        if (ownerType!="Manufacturer"){
            throw new Error(`The car can only be created by Manufacturer but current user is ${ownerType}`);
        }

        let manufacturerDetails = JSON.parse(manufacturer);
        let modelDetails = JSON.parse(model);

        const car = {
            ManufacturingId: id,
            ModelDetails: modelDetails,
            ManufacturerDetails: manufacturerDetails,
            PerUnitCost: unitCost,
            OwnerId: owner,
            OwnerType: ownerType,
            DocType: "Car",
            ManufacturingDate: new Date(),
            State: "CREATED"
        };
        
        await ctx.stub.putState(id, Buffer.from(stringify(car)));
        return JSON.stringify(car);
    }

    //ReadCar returns the car asset from the world state
    async ReadCar(ctx, id) {
        const assetJSON = await ctx.stub.getState(id); // get the asset from chaincode state
        if (!assetJSON || assetJSON.length === 0) {
            throw new Error(`The car with manufacturing Id ${id} does not exist`);
        }
        return assetJSON.toString();
    }

    //CarExists returns true when asset with given ID exists in world state.
    async CarExists(ctx, id) {
        const assetJSON = await ctx.stub.getState(id);
        return assetJSON && assetJSON.length > 0;
    }

    //DeliverCar makes a dealer delivery transaction 
    async DeliverCar(ctx, id, deliveryInfo, newOwner) {
        const assetString = await this.ReadCar(ctx, id);
        const car = JSON.parse(assetString);

        car.State = "READY_FOR_SALE";
        car.DeliveryDate = new Date(),
        car.DeliveryDetails = deliveryInfo;
        car.OwnerId = newOwner;
        car.OwnerType = "Dealer";

        await ctx.stub.putState(id, Buffer.from(stringify(car)));
        return JSON.stringify(car);
    }


    //SellCar makes a sell transaction for the customer
    async SellCar(ctx, id, sellInfo, newOwner) {
        const assetString = await this.ReadCar(ctx, id);
        const car = JSON.parse(assetString);

        if(car.OwnerType!="Dealer"){
            throw new Error(`The car can only be sold by a Dealer but current user is ${ownerType}`);
        }

        car.State = "SOLD";
        car.SellingDate = new Date(),
        car.SellingDetails = sellInfo;
        car.OwnerId = newOwner;
        car.OwnerType = "Customer";

        await ctx.stub.putState(id, Buffer.from(stringify(car)));
        return JSON.stringify(car);
    }
}

module.exports = AssetTracking;