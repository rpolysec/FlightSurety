import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.owner = null;
        this.availableAccounts = [];
        this.airlineDict = {};
        this.passengerDict = {};
        this.flightsHardCoded = [];
        this.flightsAvailable = [];
        this.initialize(callback);
    }
    
    initialize(callback) {

        this.web3.eth.getAccounts((error, accts) => {
            this.owner = accts[0];
            this.activeAccount = accts[0];
            
            this.airlineDict['ZeorAirlines'] = accts[0];
            this.airlineDict['WeFlyFastFirst'] = accts[1];
            this.airlineDict['NoTwoCarryTransports'] = accts[2];
            this.airlineDict['ThreeBabiesOnBoard'] = accts[3];
            this.airlineDict['SnowyVacations4U'] = accts[4];
            this.airlineDict['5JetsREnough'] = accts[5];
            this.airlineDict['SkyJetPlaneSix'] = accts[6];

            this.passengerDict['Sally Seven'] = accts[7];
            this.passengerDict['Eric Eight'] = accts[8];
            this.passengerDict['Nick Nine'] = accts[9];
            this.passengerDict['Tommy Ten'] = accts[10];
            this.passengerDict['Alvin Eleven'] = accts[11];
            this.passengerDict['Tammy Twelve'] = accts[12];

            let i = 0;
            for (i=0;i<30;i++){
                this.availableAccounts.push(accts[i])
            }

            this.flightsHardCoded.push('LAI-ABE');
            this.flightsHardCoded.push('DHA-LCY');
            this.flightsHardCoded.push('LCY-DHA');
            this.flightsHardCoded.push('ABE-LAI');
            this.flightsHardCoded.push('BRU-BER');
            this.flightsHardCoded.push('BER-BRU');
            this.flightsHardCoded.push('SFO-JFK');
            this.flightsHardCoded.push('FKS-HKG');
            this.flightsHardCoded.push('BER-HKG');
            this.flightsHardCoded.push('YWG-YYC');
            this.flightsHardCoded.push('JFK-SFO');
            this.flightsHardCoded.push('CPT-CRK');
            this.flightsHardCoded.push('LAI-HGK');
            this.flightsHardCoded.push('CRK-CPT');
            this.flightsHardCoded.push('HKG-BER');

            callback();
        });
    }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, (error, result) => {
                callback(error, result);
            });
    }

    authorizeAppToData(callback) {
        let self = this;
        self.flightSuretyData.methods
            .authorizeContract(self.flightSuretyApp.address)
            .send({ from: self.owner}, callback);
    }

    toggleStatus(newstatus, callback){
        let self = this;
        self.flightSuretyApp.methods
        .setOperatingStatus(newstatus)
        .send({ from: self.owner}, (error, result) => {
            callback(error, result);
        });
    }

    fetchFlightStatus(tuple, callback) {
        let self = this;
        let res = tuple.split(",");
        let payload = {
            airline: res[1],
            flight: res[0],
            timestamp: res[2]
        } 
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner}, (error, result) => {
                callback(error, payload);
            });
    }

    registerAirline(airline, callback){
        let self = this;
        self.flightSuretyApp.methods
        .registerAirline(airline)
        .send({ from: self.activeAccount}, (error, result) => {
            callback(error, result);
        });
    }

    fundAirline(value, callback){
        let self = this;
        self.flightSuretyApp.methods
        .fundAirline()
        .send({ from: self.activeAccount, value: self.web3.utils.toWei(value, 'ether')}, (error, result) => {
            callback(error, result);
        });
    }

    isAirlineRegistered(airline, callback){
        let self = this;
        self.flightSuretyApp.methods
        .isAirlineRegistered(airline)
        .call({ from: self.owner}, (error, result) => {
            callback(error, result);
        });
    }

    isAirlineFunded(callback){
        let self = this;
        self.flightSuretyApp.methods
        .isAirlineFunded(self.activeAccount)
        .call({ from: self.owner}, (error, result) => {
            callback(error, result);
        });
    }

    isAirlineNominated(callback){
        let self = this;
        self.flightSuretyApp.methods
        .isAirlineFunded(self.activeAccount)
        .call({ from: self.activeAccount}, (error, result) => {
            callback(error, result);
        });
    }

    registerFlight(flightid, callback){
        console.log(flightid);
        let self = this;
        let timestamp = Math.floor(Date.now() / 1000);
        let airline = self.activeAccount;
        self.flightSuretyApp.methods
        .registerFlight(flightid, timestamp)
        .send({ from: self.activeAccount}, (error, result) => {
            console.log(error);
            if(!error){
                result = `success ${flightid} ${airline} ${timestamp}`;
                console.log(result);
                this.flightsAvailable.push([flightid,airline,timestamp]);
            }
            callback(error, result);
        });
    }

    insureFlight(tuple, value, callback){
        let self = this;
        let res = tuple.split(",");
        let payload = {
            airline: res[1],
            flight: res[0],
            timestamp: res[2]
        } 
        self.flightSuretyApp.methods
        .InsureFlight(payload.airline,payload.flight,payload.timestamp)
        .send({ from: self.activeAccount, value: self.web3.utils.toWei(String(value), 'ether')}, (error, result) => {
            console.log(error);
            if(!error){
                console.log(result);
            }
            callback(error, result);
        });
    }

    withdrawCredits(callback){
        let self = this;
        self.flightSuretyApp.methods
        .withdrawCredits()
        .send({ from: self.activeAccount}, (error, result) => {
            console.log(error);
            if(!error){
                console.log(result);
            }
            callback(error, result);
        });
    }

    getPassengerCreditBalance(callback){
        let self = this;
        self.flightSuretyApp.methods
        .getPassengerCreditBalance()
        .call({ from: self.activeAccount}, (error, result) => {
            callback(error, result);
        });
    }

    registerOracles(index, callback){
        let self = this;
        self.flightSuretyApp.methods
        .registerOracle()
        .send({ from: self.availableAccounts[index], value: self.web3.utils.toWei('1', 'ether') }, (error, result) => {
            callback(error, result);
        });
    }
}