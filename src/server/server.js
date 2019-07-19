import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';


let config = Config['localhost'];
//let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
let OracleCount = 5;
let RegisteredOracles = [];

// Grab some available accounts to register oracles with
//web3.eth.getAccounts( async (error, accounts) =>

async function RegisterOracles() {

  // For debugging, check the contract is operational

  let operational = await flightSuretyApp.methods.isOperational.call();
  console.log(`FlighSuretyApp Found: ${operational}`);
  
  let fee = await flightSuretyApp.methods.REGISTRATION_FEE().call();
  console.log(fee);
  let accounts = await web3.eth.getAccounts();

  // register some oracles
  for(let i=1; i<OracleCount; i++) {
    console.log(accounts[i]);
    let result = await flightSuretyApp.methods.registerOracle().send({ from: accounts[i], value: fee, gas: '4712388', gasPrice: '100000000000'});
    console.log(`Registered oracle ${i}.  Retrieving indexes.`);
    console.log(result);
    let result2 = await flightSuretyApp.methods.getMyIndexes.call({from: accounts[i]})
    console.log(`Oracle Registered: ${result2[0]}, ${result2[1]}, ${result2[2]}`);
  }
}

RegisterOracles();

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


