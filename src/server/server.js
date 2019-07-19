import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';


let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);

// Grab some available accounts to register oracles with
web3.eth.getAccounts( async (error, accounts) =>  {

  let OracleCount = 5;

  flightSuretyApp.methods.isOperational.call()
  .then(function (result) {
    console.log("Returned from a promise");
    console.log(result);
  })
  .catch(function (error) {
    console.log("Error checking if contract is operational");
    console.log(error);
  });
    
  // ARRANGE
  let fee = '1'; //await flightSuretyApp.methods.REGISTRATION_FEE.call();

  // ACT
  for(let i=1; i<OracleCount; i++) {
    console.log(accounts[i]);
    flightSuretyApp.methods.registerOracle()
    .send({ from: accounts[i], value: web3.utils.toWei(fee, 'ether')})
    .then(function (result) {
      console.log("Registered Orcale " + i);
      flightSuretyApp.methods.getMyIndexes.call({from: accounts[i]})
      .then(function (result) {
        console.log(`Oracle Registered: ${result[0]}, ${result[1]}, ${result[2]}`);
      })
      .catch(function (error) {
        console.log("Error grabbing indices of Oracle");
        console.log(error);
      });
    })
    .catch(function (error) {
      console.log("Error resistering Oracle " + i);
      console.log(error);
    });
  }
});

flightSuretyApp.events.OracleRequest({
    fromBlock: 0
  }, function (error, event) {
    if (error) console.log(error)
    console.log(event)
});

const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

export default app;


