import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';


let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
//let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
let OracleCount = 25;
let RegisteredOracles = [];
let STATUS_CODES = [0, 10, 20, 30, 40, 50];

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
    let result = await flightSuretyApp.methods.registerOracle().send({ from: accounts[i], value: fee, gas: '300000', gasPrice: '1'});
    console.log(`Registered oracle ${i}.  Retrieving indexes.`);
    console.log(result);
    let result2 = await flightSuretyApp.methods.getMyIndexes.call({from: accounts[i]})
    RegisteredOracles.push(result2);
    console.log(`Oracle Registered: ${result2[0]}, ${result2[1]}, ${result2[2]}`);
    let o = {
      address: accounts[i],
      indices: result2
    };
    RegisteredOracles.push(o);
  }
}
console.log("Calling Register Oracles.");

RegisterOracles();

console.log("Back from Calling Register Oracles.");

flightSuretyApp.events.OracleRequest({
    fromBlock: 0
  }, function (error, event) {
    if (error)
    {
      console.log(error)
    }
    else {
      let index = event.returnValues.index;
      let airline = event.returnValues.airline;
      let flight = event.returnValues.flight;
      let timestamp = event.returnValues.timestamp;
      let statusCode = STATUS_CODES[Math.floor(Math.random() * STATUS_CODES.length)]
      
      for(let i = 0; i < RegisteredOracles.length; i++) {
        if(RegisteredOracles[i].index.includes(index)) {
          flightSuretyApp.methods.submitOracleResponse(index, airline, flight, timestamp, statusCode)
          .send({from: oracle_accounts[i].address}, (error, result) =>
          {
            console.log(error, result);
          });
        }
      }
    }
    console.log(event)
});

const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

export default app;


